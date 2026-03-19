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
  type ActorCriticGradientConfig,
  computeActorCriticGradients,
} from '../policy-gradient/computeActorCriticGradients.js'
import {
  StepRolloutBuffer,
  type StepRolloutBufferConfig,
  type StepRolloutSegment,
} from '../rollout/StepRolloutBuffer.js'
import { computeNStepReturns } from '../td/computeNStepReturns.js'
import {
  computeAdvantages,
  normalizeValues,
} from '../trajectory/computeAdvantages.js'
import type { ActorCriticOpenStep, ActorCriticTransition } from './types.js'

export interface ActorCriticStepAgentConfig {
  learningRate: number
  actionCount: number
  multiDiscrete?: boolean
  variant?: 'one-step' | 'n-step'
  nStepHorizon?: number
  normalizeAdvantages?: boolean
  gradientConfig: ActorCriticGradientConfig & { discountFactor: number }
  rolloutConfig: StepRolloutBufferConfig
  onSegmentTrained?: (
    segment: StepRolloutSegment<ActorCriticTransition>
  ) => void
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

function computeGroupedActorCriticGradients(
  transition: ActorCriticTransition,
  advantage: number,
  config: ActorCriticGradientConfig,
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

  if (config.clipGradients) {
    for (let i = 0; i < errors.length; i++) {
      const value = errors[i] as number
      if (value > config.gradientClipValue) {
        errors[i] = config.gradientClipValue
      } else if (value < -config.gradientClipValue) {
        errors[i] = -config.gradientClipValue
      }
    }
  }

  return errors
}

export function createActorCriticStepAgent(
  trainable: TrainableExecutor,
  config: ActorCriticStepAgentConfig,
  rng: () => number
): StepAgent {
  const multiDiscrete = config.multiDiscrete ?? false
  const rolloutBuffer = new StepRolloutBuffer<ActorCriticTransition>(
    config.rolloutConfig
  )
  let openStep: ActorCriticOpenStep | null = null

  function computeValueEstimate(state: Float64Array): number {
    const output = trainable.forward(state)
    const valueIndex = multiDiscrete
      ? 2 * config.actionCount
      : config.actionCount
    return output[valueIndex] as number
  }

  function trainSegment(
    segment: StepRolloutSegment<ActorCriticTransition>
  ): void {
    const variant = config.variant ?? 'one-step'
    const returns =
      variant === 'n-step'
        ? computeNStepReturns(segment.transitions, {
            discountFactor: config.gradientConfig.discountFactor,
            horizon: config.nStepHorizon ?? 3,
            getBootstrapValue: (transition) => transition.nextValueEstimate,
          })
        : computeNStepReturns(segment.transitions, {
            discountFactor: config.gradientConfig.discountFactor,
            horizon: 1,
            getBootstrapValue: (transition) => transition.nextValueEstimate,
          })
    const rawAdvantages = computeAdvantages(returns, segment.transitions)
    const advantages = config.normalizeAdvantages
      ? normalizeValues(rawAdvantages)
      : rawAdvantages

    for (let i = segment.transitions.length - 1; i >= 0; i--) {
      const transition = segment.transitions[i]
      if (transition === undefined) {
        throw new Error(`Missing transition at index ${i}`)
      }
      const advantage = advantages[i] as number
      const gradientConfig = {
        entropyCoefficient: config.gradientConfig.entropyCoefficient,
        clipGradients: config.gradientConfig.clipGradients,
        gradientClipValue: config.gradientConfig.gradientClipValue,
      }
      const errors = multiDiscrete
        ? computeGroupedActorCriticGradients(
            transition,
            advantage,
            gradientConfig,
            config.actionCount
          )
        : computeActorCriticGradients(transition, advantage, gradientConfig)
      trainable.forward(transition.state)
      trainable.backward(errors, config.learningRate)
    }

    config.onSegmentTrained?.(segment)
  }

  return {
    act(observation: Float64Array): Float64Array {
      if (openStep !== null) {
        throw new Error(
          'completeStep() must be called before act() opens another step'
        )
      }

      const rawOutput = trainable.forward(observation)
      const copiedOutput = Float64Array.from(rawOutput)
      const actionProbabilities = multiDiscrete
        ? extractGroupedBinaryValues(
            copiedOutput,
            config.actionCount,
            'Actor-Critic step agent'
          )
        : extractLeadingValues(
            copiedOutput,
            config.actionCount,
            'Actor-Critic step agent'
          )
      const action = multiDiscrete
        ? sampleGroupedBinaryAction(
            actionProbabilities,
            config.actionCount,
            rng
          )
        : sampleAction(actionProbabilities, rng)
      const valueIndex = multiDiscrete
        ? 2 * config.actionCount
        : config.actionCount

      openStep = {
        state: Float64Array.from(observation),
        rawOutput: copiedOutput,
        action,
        actionProbabilities,
        valueEstimate: rawOutput[valueIndex] as number,
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
        nextValueEstimate: outcome.terminated
          ? 0
          : computeValueEstimate(outcome.nextState),
      }

      const segment = rolloutBuffer.push(transition)
      openStep = null

      if (segment !== null) {
        trainSegment(segment)
      }
    },

    startEpisode(info: StepEpisodeInfo): void {
      openStep = null
      rolloutBuffer.reset(info.episodeIndex)
    },

    endEpisode(_result: StepEpisodeResult): void {
      if (openStep !== null) {
        throw new Error(
          'endEpisode() called with an open step. Each act() must be followed by completeStep() before endEpisode()'
        )
      }
      const segment = rolloutBuffer.flush()
      if (segment !== null) {
        trainSegment(segment)
      }
    },
  }
}
