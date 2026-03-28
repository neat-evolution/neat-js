import type { TrainableExecutor } from '@neat-evolution/executor'
import type { StepAgent } from '../../core/StepAgent.js'
import type {
  StepEpisodeInfo,
  StepEpisodeResult,
  StepOutcome,
} from '../../core/StepTypes.js'
import {
  chosenGroupedCategoricalIndices,
  extractGroupedCategoricalValues,
  extractLeadingValues,
  groupedActionOutputCount,
  resolveGroupedActionFactorSizes,
  sampleGroupedCategoricalAction,
} from '../action-space/groupedCategorical.js'
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
  actionFactorSizes?: readonly number[]
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
  factorSizes: readonly number[]
): Float64Array {
  const actionOutputCount = factorSizes.reduce((sum, size) => sum + size, 0)
  const errors = new Float64Array(actionOutputCount + 1)
  const chosenIndices = chosenGroupedCategoricalIndices(
    transition.action,
    factorSizes,
    'Actor-Critic step agent'
  )

  for (const chosenIndex of chosenIndices) {
    const chosenProbability = Math.max(
      transition.actionProbabilities[chosenIndex] as number,
      1e-10
    )
    errors[chosenIndex] = -advantage / chosenProbability
  }

  if (config.entropyCoefficient !== 0) {
    let offset = 0
    for (const size of factorSizes) {
      for (let i = 0; i < size; i++) {
        const index = offset + i
        const probability = Math.max(
          transition.actionProbabilities[index] as number,
          1e-10
        )
        errors[index] =
          (errors[index] as number) +
          config.entropyCoefficient * (Math.log(probability) + 1)
      }
      offset += size
    }
  }

  errors[actionOutputCount] = -advantage

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
  const factorSizes = multiDiscrete
    ? resolveGroupedActionFactorSizes(
        config.actionCount,
        config.actionFactorSizes
      )
    : undefined
  const groupedOutputCount = factorSizes
    ? groupedActionOutputCount(config.actionCount, factorSizes)
    : 0
  const rolloutBuffer = new StepRolloutBuffer<ActorCriticTransition>(
    config.rolloutConfig
  )
  let openStep: ActorCriticOpenStep | null = null

  function computeValueEstimate(state: Float64Array): number {
    const output = trainable.forward(state)
    const valueIndex = multiDiscrete
      ? groupedOutputCount
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
            factorSizes as number[]
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
        ? extractGroupedCategoricalValues(
            copiedOutput,
            factorSizes as number[],
            'Actor-Critic step agent'
          )
        : extractLeadingValues(
            copiedOutput,
            config.actionCount,
            'Actor-Critic step agent'
          )
      const action = multiDiscrete
        ? sampleGroupedCategoricalAction(
            actionProbabilities,
            factorSizes as number[],
            rng
          )
        : sampleAction(actionProbabilities, rng)
      const valueIndex = multiDiscrete
        ? groupedOutputCount
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
