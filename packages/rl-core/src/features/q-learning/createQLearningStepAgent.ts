import type { TrainableExecutor } from '@neat-evolution/executor'
import type { StepAgent } from '../../core/StepAgent.js'
import {
  computeGroupedBinaryBootstrapValues,
  extractGroupedBinaryValues,
  extractLeadingValues,
  selectGroupedBinaryAction,
} from '../action-space/groupedBinary.js'
import type {
  StepEpisodeInfo,
  StepEpisodeResult,
  StepOutcome,
} from '../../core/StepTypes.js'
import {
  StepRolloutBuffer,
  type StepRolloutBufferConfig,
  type StepRolloutSegment,
} from '../rollout/StepRolloutBuffer.js'
import {
  computeDiscountedReturns,
  maxQBootstrap,
} from '../td/computeDiscountedReturns.js'
import type { QLearningOpenStep, QLearningTransition } from './types.js'

export interface QLearningStepAgentConfig {
  learningRate: number
  actionCount: number
  multiDiscrete?: boolean
  discountFactor: number
  epsilonInitial: number
  epsilonDecayPerEpisode?: number
  epsilonMinimum?: number
  rolloutConfig: StepRolloutBufferConfig
  onSegmentTrained?: (segment: StepRolloutSegment<QLearningTransition>) => void
}

function selectAction(
  qValues: Float64Array,
  epsilon: number,
  rng: () => number
): { action: Float64Array; chosenActionIndex: number } {
  let chosenActionIndex = 0
  if (rng() < epsilon) {
    chosenActionIndex = Math.floor(rng() * qValues.length)
  } else {
    let bestValue = qValues[0] as number
    for (let i = 1; i < qValues.length; i++) {
      const value = qValues[i] as number
      if (value > bestValue) {
        bestValue = value
        chosenActionIndex = i
      }
    }
  }

  const action = new Float64Array(qValues.length)
  action[chosenActionIndex] = 1
  return { action, chosenActionIndex }
}

function computeQOutputErrors(
  transition: QLearningTransition,
  target: number
): Float64Array {
  const errors = new Float64Array(transition.rawOutput.length)
  const chosenQValue = transition.qValues[transition.chosenActionIndex] as number
  errors[transition.chosenActionIndex] = chosenQValue - target
  return errors
}

export function createQLearningStepAgent(
  trainable: TrainableExecutor,
  config: QLearningStepAgentConfig,
  rng: () => number
): StepAgent {
  const multiDiscrete = config.multiDiscrete ?? false
  const rolloutBuffer = new StepRolloutBuffer<QLearningTransition>(
    config.rolloutConfig
  )
  const epsilonDecayPerEpisode = config.epsilonDecayPerEpisode ?? 1
  const epsilonMinimum = config.epsilonMinimum ?? 0

  let epsilon = config.epsilonInitial
  let episodesStarted = 0
  let openStep: QLearningOpenStep | null = null

  function computeNextQValues(nextState: Float64Array): Float64Array {
    const rawOutput = Float64Array.from(trainable.forward(nextState))
    return multiDiscrete
      ? extractGroupedBinaryValues(
          rawOutput,
          config.actionCount,
          'Q-learning step agent'
        )
      : extractLeadingValues(
          rawOutput,
          config.actionCount,
          'Q-learning step agent'
        )
  }

  function trainSegment(segment: StepRolloutSegment<QLearningTransition>): void {
    if (multiDiscrete) {
      const lastTransition =
        segment.transitions[segment.transitions.length - 1]
      if (lastTransition === undefined) {
        throw new Error('Missing last transition for grouped Q-learning')
      }

      const bootstrapValues = lastTransition.terminated
        ? new Float64Array(config.actionCount)
        : computeGroupedBinaryBootstrapValues(
            lastTransition.nextQValues,
            config.actionCount
          )
      const returns = Float64Array.from(bootstrapValues)

      for (let i = segment.transitions.length - 1; i >= 0; i--) {
        const transition = segment.transitions[i]
        if (transition === undefined) {
          throw new Error(`Missing transition at index ${i}`)
        }

        const errors = new Float64Array(transition.rawOutput.length)
        for (
          let factorIndex = 0;
          factorIndex < transition.action.length;
          factorIndex++
        ) {
          returns[factorIndex] =
            transition.reward +
            config.discountFactor * (returns[factorIndex] as number)
          const chosenIndex =
            transition.action[factorIndex] === 1
              ? 2 * factorIndex
              : 2 * factorIndex + 1
          errors[chosenIndex] =
            (transition.qValues[chosenIndex] as number) -
            (returns[factorIndex] as number)
        }

        trainable.forward(transition.state)
        trainable.backward(errors, config.learningRate)
      }

      config.onSegmentTrained?.(segment)
      return
    }

    const returns = computeDiscountedReturns(segment.transitions, {
      discountFactor: config.discountFactor,
      getBootstrapValue: (transition) => maxQBootstrap(transition.nextQValues),
    })

    for (let i = segment.transitions.length - 1; i >= 0; i--) {
      const transition = segment.transitions[i]
      if (transition === undefined) {
        throw new Error(`Missing transition at index ${i}`)
      }
      const target = returns[i] as number
      const errors = computeQOutputErrors(transition, target)
      trainable.forward(transition.state)
      trainable.backward(errors, config.learningRate)
    }

    config.onSegmentTrained?.(segment)
  }

  return {
    act(observation: Float64Array): Float64Array {
      if (openStep !== null) {
        throw new Error('completeStep() must be called before act() opens another step')
      }

      const rawOutput = Float64Array.from(trainable.forward(observation))
      const qValues = multiDiscrete
        ? extractGroupedBinaryValues(
            rawOutput,
            config.actionCount,
            'Q-learning step agent'
          )
        : extractLeadingValues(
            rawOutput,
            config.actionCount,
            'Q-learning step agent'
          )
      const standardSelection = multiDiscrete
        ? null
        : selectAction(qValues, epsilon, rng)
      const action = multiDiscrete
        ? selectGroupedBinaryAction(qValues, config.actionCount, epsilon, rng)
        : (standardSelection?.action as Float64Array)
      const chosenActionIndex = standardSelection?.chosenActionIndex ?? 0

      openStep = {
        state: Float64Array.from(observation),
        rawOutput,
        action,
        qValues,
        chosenActionIndex,
      }

      return action
    },

    completeStep(outcome: StepOutcome): void {
      if (openStep === null) {
        throw new Error('completeStep() called without an open step')
      }

      const transition: QLearningTransition = {
        state: openStep.state,
        rawOutput: openStep.rawOutput,
        action: openStep.action,
        reward: outcome.reward,
        nextState: Float64Array.from(outcome.nextState),
        terminated: outcome.terminated,
        truncated: outcome.truncated,
        ...(outcome.info !== undefined ? { info: outcome.info } : {}),
        qValues: openStep.qValues,
        nextQValues: outcome.terminated
          ? new Float64Array(multiDiscrete ? 2 * config.actionCount : config.actionCount)
          : computeNextQValues(outcome.nextState),
        chosenActionIndex: openStep.chosenActionIndex,
      }

      const segment = rolloutBuffer.push(transition)
      openStep = null

      if (segment !== null) {
        trainSegment(segment)
      }
    },

    startEpisode(info: StepEpisodeInfo): void {
      rolloutBuffer.reset(info.episodeIndex)
      openStep = null

      if (episodesStarted === 0) {
        epsilon = config.epsilonInitial
      } else {
        epsilon = Math.max(epsilonMinimum, epsilon * epsilonDecayPerEpisode)
      }
      episodesStarted += 1
    },

    endEpisode(_result: StepEpisodeResult): void {
      if (openStep !== null) {
        throw new Error('endEpisode() called before the current step was completed')
      }
      const segment = rolloutBuffer.flush()
      if (segment !== null) {
        trainSegment(segment)
      }
    },
  }
}
