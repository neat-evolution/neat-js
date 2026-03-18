import type { TrainableExecutor } from '@neat-evolution/executor'
import type { StepAgent } from '../../core/StepAgent.js'
import type {
  StepEpisodeInfo,
  StepEpisodeResult,
  StepOutcome,
} from '../../core/StepTypes.js'
import { extractLeadingValues } from '../action-space/groupedBinary.js'
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

function sampleAction(probabilities: Float64Array, rng: () => number): Float64Array {
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
  const collector = new TrajectoryBatchCollector<ActorCriticTransition>(
    config.trajectoryConfig
  )
  let openStep: ActorCriticOpenStep | null = null

  function computeValueEstimate(output: Float64Array): number {
    return output[config.actionCount] as number
  }

  function trainBatch(transitions: readonly ActorCriticTransition[]): void {
    if (transitions.length === 0) {
      return
    }

    const rawAdvantages = computeGeneralizedAdvantages(transitions, {
      discountFactor: config.discountFactor,
      lambda: config.gaeLambda ?? 0.95,
    })
    const advantages = config.normalizeAdvantages === false
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
      for (let start = 0; start < indices.length; start += config.minibatchSize) {
        const batchIndices = indices.slice(start, start + config.minibatchSize)
        for (const index of batchIndices) {
          const transition = transitions[index]
          if (transition === undefined) {
            throw new Error(`Missing transition at index ${index}`)
          }
          const currentOutput = Float64Array.from(trainable.forward(transition.state))
          const currentProbabilities = extractLeadingValues(
            currentOutput,
            config.actionCount,
            'PPO step agent'
          )
          const currentLogProbability = computeActionLogProbability(
            transition.action,
            currentProbabilities
          )
          const ratio = Math.exp(
            currentLogProbability - transition.actionLogProbability
          )
          const advantage = advantages[index] as number
          const clippedRatio = Math.min(
            Math.max(ratio, 1 - config.clipEpsilon),
            1 + config.clipEpsilon
          )

          let chosenIndex = 0
          for (let i = 0; i < transition.action.length; i++) {
            if (transition.action[i] === 1) {
              chosenIndex = i
              break
            }
          }

          const errors = new Float64Array(config.actionCount + 1)
          const oldProbability = Math.exp(transition.actionLogProbability)
          const useClippedBranch =
            (advantage >= 0 && ratio > clippedRatio) ||
            (advantage < 0 && ratio < clippedRatio)

          if (!useClippedBranch) {
            errors[chosenIndex] = -advantage / Math.max(oldProbability, 1e-10)
          }

          if (config.entropyCoefficient !== 0) {
            for (let i = 0; i < currentProbabilities.length; i++) {
              errors[i] =
                (errors[i] as number) +
                config.entropyCoefficient *
                  (Math.log(Math.max(currentProbabilities[i] as number, 1e-10)) + 1)
            }
          }

          const valueEstimate = computeValueEstimate(currentOutput)
          errors[config.actionCount] =
            ((valueEstimate - (returnTargets[index] as number)) *
              (config.valueLossCoefficient ?? 0.5))

          trainable.backward(errors, config.learningRate)
        }
      }
    }
  }

  return {
    act(observation: Float64Array): Float64Array {
      if (openStep !== null) {
        throw new Error('completeStep() must be called before act() opens another step')
      }

      const rawOutput = Float64Array.from(trainable.forward(observation))
      const actionProbabilities = extractLeadingValues(
        rawOutput,
        config.actionCount,
        'PPO step agent'
      )
      const action = sampleAction(actionProbabilities, rng)

      openStep = {
        state: Float64Array.from(observation),
        rawOutput,
        action,
        actionProbabilities,
        valueEstimate: computeValueEstimate(rawOutput),
        actionLogProbability: computeActionLogProbability(action, actionProbabilities),
      }

      return action
    },

    completeStep(outcome: StepOutcome): void {
      if (openStep === null) {
        throw new Error('completeStep() called without an open step')
      }

      const nextOutput = outcome.terminated
        ? null
        : Float64Array.from(trainable.forward(outcome.nextState))
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
        nextValueEstimate: nextOutput === null ? 0 : computeValueEstimate(nextOutput),
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
        throw new Error('endEpisode() called before the current step was completed')
      }
      const batch = collector.endEpisode()
      if (batch !== null) {
        trainBatch(batch.transitions)
      }
    },
  }
}
