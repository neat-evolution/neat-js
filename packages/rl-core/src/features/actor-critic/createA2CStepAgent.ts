import type { TrainableExecutor } from '@neat-evolution/executor'
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
  computeActorCriticGradients,
  type ActorCriticGradientConfig,
} from '../policy-gradient/computeActorCriticGradients.js'
import {
  computeGeneralizedAdvantages,
  normalizeValues,
} from '../trajectory/computeAdvantages.js'
import {
  TrajectoryBatchCollector,
  type TrajectoryBatchCollectorConfig,
} from '../trajectory/TrajectoryBatchCollector.js'
import type { ActorCriticOpenStep, ActorCriticTransition } from './types.js'

export interface A2CStepAgentConfig {
  learningRate: number
  actionCount: number
  multiDiscrete?: boolean
  discountFactor: number
  gaeLambda?: number
  normalizeAdvantages?: boolean
  gradientConfig: Omit<ActorCriticGradientConfig, 'discountFactor'>
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

function computeGroupedActorCriticGradients(
  transition: ActorCriticTransition,
  advantage: number,
  config: Omit<ActorCriticGradientConfig, 'discountFactor'>,
  factorCount: number
): Float64Array {
  const errors = new Float64Array(2 * factorCount + 1)

  for (let factorIndex = 0; factorIndex < factorCount; factorIndex++) {
    const pOn = Math.max(
      transition.actionProbabilities[2 * factorIndex] as number,
      1e-10
    )
    const pOff = Math.max(
      transition.actionProbabilities[2 * factorIndex + 1] as number,
      1e-10
    )
    const chooseOn = transition.action[factorIndex] === 1
    const chosenIndex = chooseOn ? 2 * factorIndex : 2 * factorIndex + 1
    const chosenProbability = chooseOn ? pOn : pOff

    errors[chosenIndex] = -advantage / chosenProbability

    if (config.entropyCoefficient !== 0) {
      errors[2 * factorIndex] =
        (errors[2 * factorIndex] as number) +
        config.entropyCoefficient * (Math.log(pOn) + 1)
      errors[2 * factorIndex + 1] =
        (errors[2 * factorIndex + 1] as number) +
        config.entropyCoefficient * (Math.log(pOff) + 1)
    }
  }

  errors[2 * factorCount] = -advantage
  return errors
}

export function createA2CStepAgent(
  trainable: TrainableExecutor,
  config: A2CStepAgentConfig,
  rng: () => number
): StepAgent {
  const multiDiscrete = config.multiDiscrete ?? false
  const collector = new TrajectoryBatchCollector<ActorCriticTransition>(
    config.trajectoryConfig
  )
  let openStep: ActorCriticOpenStep | null = null

  function computeValueEstimate(state: Float64Array): number {
    const output = trainable.forward(state)
    const valueIndex = multiDiscrete ? 2 * config.actionCount : config.actionCount
    return output[valueIndex] as number
  }

  function trainBatch(transitions: readonly ActorCriticTransition[]): void {
    if (transitions.length === 0) {
      return
    }

    const advantages = computeGeneralizedAdvantages(transitions, {
      discountFactor: config.discountFactor,
      lambda: config.gaeLambda ?? 1,
    })
    const normalizedAdvantages = config.normalizeAdvantages
      ? normalizeValues(advantages)
      : advantages

    for (let i = transitions.length - 1; i >= 0; i--) {
      const transition = transitions[i]
      if (transition === undefined) {
        throw new Error(`Missing transition at index ${i}`)
      }
      const advantage = normalizedAdvantages[i] as number
      const errors = multiDiscrete
        ? computeGroupedActorCriticGradients(
            transition,
            advantage,
            config.gradientConfig,
            config.actionCount
          )
        : computeActorCriticGradients(transition, advantage, config.gradientConfig)
      trainable.forward(transition.state)
      trainable.backward(errors, config.learningRate)
    }
  }

  return {
    act(observation: Float64Array): Float64Array {
      if (openStep !== null) {
        throw new Error('completeStep() must be called before act() opens another step')
      }

      const rawOutput = Float64Array.from(trainable.forward(observation))
      const actionProbabilities = multiDiscrete
        ? extractGroupedBinaryValues(rawOutput, config.actionCount, 'A2C step agent')
        : extractLeadingValues(rawOutput, config.actionCount, 'A2C step agent')
      const action = multiDiscrete
        ? sampleGroupedBinaryAction(actionProbabilities, config.actionCount, rng)
        : sampleAction(actionProbabilities, rng)
      const valueIndex = multiDiscrete ? 2 * config.actionCount : config.actionCount

      openStep = {
        state: Float64Array.from(observation),
        rawOutput,
        action,
        actionProbabilities,
        valueEstimate: rawOutput[valueIndex] as number,
        actionLogProbability: computeActionLogProbability(action, actionProbabilities),
      }

      return action
    },

    completeStep(outcome: StepOutcome): void {
      if (openStep === null) {
        throw new Error('completeStep() called without an open step')
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
        nextValueEstimate: outcome.terminated ? 0 : computeValueEstimate(outcome.nextState),
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
