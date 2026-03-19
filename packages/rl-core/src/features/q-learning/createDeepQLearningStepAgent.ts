import type {
  Executor,
  StaticExecutor,
  TrainableExecutor,
} from '@neat-evolution/executor'
import type { StepAgent } from '../../core/StepAgent.js'
import type {
  StepEpisodeInfo,
  StepEpisodeResult,
  StepOutcome,
} from '../../core/StepTypes.js'
import {
  computeGroupedBinaryBootstrapValues,
  extractGroupedBinaryValues,
  extractLeadingValues,
  selectGroupedBinaryAction,
} from '../action-space/groupedBinary.js'
import { ReplayBuffer } from '../replay/ReplayBuffer.js'
import { maxQBootstrap } from '../td/computeDiscountedReturns.js'
import type { QLearningOpenStep, QLearningTransition } from './types.js'

export interface DeepQLearningStepAgentConfig {
  learningRate: number
  actionCount: number
  multiDiscrete?: boolean
  discountFactor: number
  epsilonInitial: number
  epsilonDecayPerEpisode?: number
  epsilonMinimum?: number
  replayCapacity: number
  replayBatchSize: number
  replayWarmupSize: number
  trainEverySteps?: number
  gradientStepsPerUpdate?: number
  targetSyncInterval: number
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

function computeStateQValues(
  executor: Executor,
  state: Float64Array,
  actionCount: number,
  multiDiscrete: boolean
): Float64Array {
  const rawOutput = Float64Array.from(executor.forward(state))
  return multiDiscrete
    ? extractGroupedBinaryValues(rawOutput, actionCount, 'DQL step agent')
    : extractLeadingValues(rawOutput, actionCount, 'DQL step agent')
}

export function createDeepQLearningStepAgent(
  trainable: TrainableExecutor,
  config: DeepQLearningStepAgentConfig,
  rng: () => number
): StepAgent {
  const multiDiscrete = config.multiDiscrete ?? false
  const replayBuffer = new ReplayBuffer<QLearningTransition>({
    capacity: config.replayCapacity,
  })
  const epsilonDecayPerEpisode = config.epsilonDecayPerEpisode ?? 1
  const epsilonMinimum = config.epsilonMinimum ?? 0
  const trainEverySteps = config.trainEverySteps ?? 1
  const gradientStepsPerUpdate = config.gradientStepsPerUpdate ?? 1

  let epsilon = config.epsilonInitial
  let episodesStarted = 0
  let openStep: QLearningOpenStep | null = null
  let stepsSeen = 0
  let updatesApplied = 0
  let targetExecutor: StaticExecutor = trainable.createSnapshot()

  function syncTarget(): void {
    targetExecutor = trainable.createSnapshot()
  }

  function computeTargetQValues(nextState: Float64Array): Float64Array {
    return computeStateQValues(
      targetExecutor,
      nextState,
      config.actionCount,
      multiDiscrete
    )
  }

  function trainFromReplay(): void {
    if (replayBuffer.size < config.replayWarmupSize) {
      return
    }

    for (let step = 0; step < gradientStepsPerUpdate; step++) {
      const samples = replayBuffer.sample(config.replayBatchSize, rng)
      for (const transition of samples) {
        if (multiDiscrete) {
          const bootstrapValues = transition.terminated
            ? new Float64Array(config.actionCount)
            : computeGroupedBinaryBootstrapValues(
                transition.nextQValues,
                config.actionCount
              )
          const errors = new Float64Array(transition.rawOutput.length)
          for (
            let factorIndex = 0;
            factorIndex < transition.action.length;
            factorIndex++
          ) {
            const chosenIndex =
              transition.action[factorIndex] === 1
                ? 2 * factorIndex
                : 2 * factorIndex + 1
            const target =
              transition.reward +
              config.discountFactor * (bootstrapValues[factorIndex] as number)
            errors[chosenIndex] =
              (transition.qValues[chosenIndex] as number) - target
          }
          trainable.forward(transition.state)
          trainable.backward(errors, config.learningRate)
          continue
        }

        const target =
          transition.reward +
          config.discountFactor *
            (transition.terminated ? 0 : maxQBootstrap(transition.nextQValues))
        const errors = new Float64Array(transition.rawOutput.length)
        const chosenQValue = transition.qValues[
          transition.chosenActionIndex
        ] as number
        errors[transition.chosenActionIndex] = chosenQValue - target
        trainable.forward(transition.state)
        trainable.backward(errors, config.learningRate)
      }

      updatesApplied += 1
      if (updatesApplied % config.targetSyncInterval === 0) {
        syncTarget()
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

      const rawOutput = Float64Array.from(trainable.forward(observation))
      const qValues = multiDiscrete
        ? extractGroupedBinaryValues(
            rawOutput,
            config.actionCount,
            'DQL step agent'
          )
        : extractLeadingValues(rawOutput, config.actionCount, 'DQL step agent')
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
          ? new Float64Array(
              multiDiscrete ? 2 * config.actionCount : config.actionCount
            )
          : computeTargetQValues(outcome.nextState),
        chosenActionIndex: openStep.chosenActionIndex,
      }

      replayBuffer.push(transition)
      openStep = null
      stepsSeen += 1

      if (stepsSeen % trainEverySteps === 0) {
        trainFromReplay()
      }
    },

    startEpisode(_info: StepEpisodeInfo): void {
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
        throw new Error(
          'endEpisode() called before the current step was completed'
        )
      }
    },
  }
}
