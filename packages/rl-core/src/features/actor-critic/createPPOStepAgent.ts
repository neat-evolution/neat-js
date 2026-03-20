import type { Outputs, TrainableExecutor } from '@neat-evolution/executor'
import type { StepAgent } from '../../core/StepAgent.js'
import type {
  StepEpisodeInfo,
  StepEpisodeResult,
  StepOutcome,
} from '../../core/StepTypes.js'
import {
  extractGroupedBinaryValues,
  extractLeadingValues,
  sampleGroupedBinaryAction,
} from '../action-space/groupedBinary.js'
import { computeActionLogProbability } from '../policy-gradient/actionLogProbabilities.js'
import {
  computeGeneralizedAdvantages,
  normalizeValues,
} from '../trajectory/computeAdvantages.js'
import {
  TrajectoryBatchCollector,
  type TrajectoryBatchCollectorConfig,
} from '../trajectory/TrajectoryBatchCollector.js'
import type { ActorCriticOpenStep, ActorCriticTransition } from './types.js'

export interface PPOStepAgentConfig {
  learningRate: number
  actionCount: number
  multiDiscrete?: boolean
  discountFactor: number
  clipEpsilon: number
  entropyCoefficient: number
  valueLossCoefficient?: number
  gaeLambda?: number
  normalizeAdvantages?: boolean
  minibatchSize: number
  epochs: number
  trajectoryConfig: TrajectoryBatchCollectorConfig
}

/** Release a pooled output back to the executor's pool if applicable. */
function releaseOutput(output: Outputs): void {
  if (
    output instanceof Float64Array &&
    'release' in output &&
    typeof (output as unknown as { release: () => void }).release === 'function'
  ) {
    ;(output as unknown as { release: () => void }).release()
  }
}

function sampleAction(
  probabilities: Float64Array,
  rng: () => number
): Float64Array {
  const action = new Float64Array(probabilities.length)
  const threshold = rng()
  let cumulative = 0
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i] as number
    if (threshold < cumulative) {
      action[i] = 1
      return action
    }
  }
  action[probabilities.length - 1] = 1
  return action
}

function shuffleIndices(length: number, rng: () => number): number[] {
  const indices = Array.from({ length }, (_, index) => index)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = indices[i]
    const b = indices[j]
    if (a === undefined || b === undefined) {
      continue
    }
    indices[i] = b
    indices[j] = a
  }
  return indices
}

export function createPPOStepAgent(
  trainable: TrainableExecutor,
  config: PPOStepAgentConfig,
  rng: () => number
): StepAgent {
  const multiDiscrete = config.multiDiscrete ?? false
  const collector = new TrajectoryBatchCollector<ActorCriticTransition>(
    config.trajectoryConfig
  )
  let openStep: ActorCriticOpenStep | null = null

  const valueIndex = multiDiscrete ? 2 * config.actionCount : config.actionCount
  const probCount = multiDiscrete ? 2 * config.actionCount : config.actionCount
  const outputCount = multiDiscrete
    ? 2 * config.actionCount + 1
    : config.actionCount + 1

  // Placeholder for rawOutput in transitions — PPO's trainBatch re-forwards
  // transition.state and never reads rawOutput, so we avoid allocating a copy.
  const actRawOutputPlaceholder = new Float64Array(outputCount)

  // Pre-allocated buffers for trainBatch inner loop — avoids ~19K Float64Array
  // allocations per organism (transitions × epochs × 3 arrays).
  const trainProbabilities = new Float64Array(probCount)
  const trainErrors = new Float64Array(outputCount)

  function computeValueEstimate(output: Float64Array): number {
    return output[valueIndex] as number
  }

  function trainBatch(transitions: readonly ActorCriticTransition[]): void {
    if (transitions.length === 0) {
      return
    }

    const rawAdvantages = computeGeneralizedAdvantages(transitions, {
      discountFactor: config.discountFactor,
      lambda: config.gaeLambda ?? 0.95,
    })
    const advantages =
      config.normalizeAdvantages === false
        ? rawAdvantages
        : normalizeValues(rawAdvantages)

    const returnTargets = new Float64Array(transitions.length)
    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i]
      if (transition === undefined) {
        throw new Error(`Missing transition at index ${i}`)
      }
      returnTargets[i] = (advantages[i] as number) + transition.valueEstimate
    }

    for (let epoch = 0; epoch < config.epochs; epoch++) {
      const indices = shuffleIndices(transitions.length, rng)
      for (
        let start = 0;
        start < indices.length;
        start += config.minibatchSize
      ) {
        const batchIndices = indices.slice(start, start + config.minibatchSize)
        for (const index of batchIndices) {
          const transition = transitions[index]
          if (transition === undefined) {
            throw new Error(`Missing transition at index ${index}`)
          }

          // Read forward output and release the pooled array after extracting values
          const currentOutput = trainable.forward(transition.state)

          // Copy probabilities and value into reusable buffers, then release
          for (let i = 0; i < probCount; i++) {
            trainProbabilities[i] = currentOutput[i] as number
          }
          const currentValueEstimate = computeValueEstimate(currentOutput)
          releaseOutput(currentOutput)

          const currentLogProbability = computeActionLogProbability(
            transition.action,
            trainProbabilities
          )
          const ratio = Math.exp(
            currentLogProbability - transition.actionLogProbability
          )
          const advantage = advantages[index] as number
          const clippedRatio = Math.min(
            Math.max(ratio, 1 - config.clipEpsilon),
            1 + config.clipEpsilon
          )

          const useClippedBranch =
            (advantage >= 0 && ratio > clippedRatio) ||
            (advantage < 0 && ratio < clippedRatio)

          // Zero the reusable errors buffer
          trainErrors.fill(0)

          if (!useClippedBranch) {
            if (multiDiscrete) {
              for (
                let factorIndex = 0;
                factorIndex < config.actionCount;
                factorIndex++
              ) {
                const chosenIdx =
                  transition.action[factorIndex] === 1
                    ? 2 * factorIndex
                    : 2 * factorIndex + 1
                const oldProb = Math.max(
                  transition.actionProbabilities[chosenIdx] as number,
                  1e-10
                )
                trainErrors[chosenIdx] = -advantage / oldProb
              }
            } else {
              let chosenIndex = 0
              for (let i = 0; i < transition.action.length; i++) {
                if (transition.action[i] === 1) {
                  chosenIndex = i
                  break
                }
              }
              const oldProbability = Math.exp(transition.actionLogProbability)
              trainErrors[chosenIndex] =
                -advantage / Math.max(oldProbability, 1e-10)
            }
          }

          if (config.entropyCoefficient !== 0) {
            for (let i = 0; i < probCount; i++) {
              trainErrors[i] =
                (trainErrors[i] as number) +
                config.entropyCoefficient *
                  (Math.log(Math.max(trainProbabilities[i] as number, 1e-10)) +
                    1)
            }
          }

          trainErrors[valueIndex] =
            (currentValueEstimate - (returnTargets[index] as number)) *
            (config.valueLossCoefficient ?? 0.5)

          trainable.backward(trainErrors, config.learningRate)
        }
      }
    }
  }

  return {
    act(observation: Float64Array): Float64Array {
      if (openStep !== null) {
        throw new Error(
          'completeStep() must be called before act() opens another step'
        )
      }

      // Read values from pooled forward output and release — PPO's trainBatch
      // re-forwards transition.state, so rawOutput is never read during training.
      const fwdOutput = trainable.forward(observation)
      const actionProbabilities = multiDiscrete
        ? extractGroupedBinaryValues(
            fwdOutput,
            config.actionCount,
            'PPO step agent'
          )
        : extractLeadingValues(fwdOutput, config.actionCount, 'PPO step agent')
      const actValueEstimate = computeValueEstimate(fwdOutput)
      releaseOutput(fwdOutput)

      const action = multiDiscrete
        ? sampleGroupedBinaryAction(
            actionProbabilities,
            config.actionCount,
            rng
          )
        : sampleAction(actionProbabilities, rng)

      openStep = {
        state: Float64Array.from(observation),
        rawOutput: actRawOutputPlaceholder,
        action,
        actionProbabilities,
        valueEstimate: actValueEstimate,
        actionLogProbability: computeActionLogProbability(
          action,
          actionProbabilities
        ),
      }

      return action
    },

    completeStep(outcome: StepOutcome): void {
      if (openStep === null) {
        throw new Error('completeStep() called without an open step')
      }

      // Extract next value estimate directly without copying the full forward output
      let nextValueEstimate = 0
      if (!outcome.terminated) {
        const nextOutput = trainable.forward(outcome.nextState)
        nextValueEstimate = computeValueEstimate(nextOutput)
        releaseOutput(nextOutput)
      }
      const transition: ActorCriticTransition = {
        state: openStep.state,
        rawOutput: openStep.rawOutput,
        action: openStep.action,
        reward: outcome.reward,
        nextState: Float64Array.from(outcome.nextState),
        terminated: outcome.terminated,
        truncated: outcome.truncated,
        ...(outcome.info !== undefined ? { info: outcome.info } : {}),
        actionProbabilities: openStep.actionProbabilities,
        valueEstimate: openStep.valueEstimate,
        actionLogProbability: openStep.actionLogProbability,
        nextValueEstimate,
      }

      openStep = null
      const batch = collector.push(transition)
      if (batch !== null) {
        trainBatch(batch.transitions)
      }
    },

    startEpisode(info: StepEpisodeInfo): void {
      openStep = null
      collector.startEpisode(info.episodeIndex)
    },

    endEpisode(_result: StepEpisodeResult): void {
      if (openStep !== null) {
        throw new Error(
          'endEpisode() called with an open step. Each act() must be followed by completeStep() before endEpisode()'
        )
      }
      const batch = collector.endEpisode()
      if (batch !== null) {
        trainBatch(batch.transitions)
      }
    },
  }
}
