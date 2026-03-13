import type { TrainableExecutor } from '@neat-evolution/backprop'
import type {
  EpisodeInfo,
  EpisodeResult,
  EpisodicAgent,
  RolloutBufferConfig,
  RolloutSegment,
  Transition,
  TransitionInfo,
} from '@neat-evolution/environment'
import { applyActorActivation } from './activations.js'
import type { ACGradientConfig } from './computeACGradients.js'
import { RolloutBuffer } from './RolloutBuffer.js'
import { trainOnSegment } from './trainOnSegment.js'

/** Configuration for the AC agent factory. */
export interface ACAgentConfig {
  /** Learning rate for backward pass. */
  learningRate: number
  /** Number of actor outputs (environment's action count). */
  actionCount: number
  /** AC gradient configuration. */
  gradientConfig: ACGradientConfig
  /** Rollout buffer configuration. */
  rolloutConfig: RolloutBufferConfig
  /** Output activation for actor outputs (default: sigmoid). */
  actorActivation?: 'sigmoid' | 'softmax' | 'tanh'
  /** Optional callback invoked whenever a rollout segment trains (telemetry). */
  onSegmentTrained?: (segment: RolloutSegment) => void
}

/**
 * Sample an action index from a probability distribution using the provided RNG.
 * Returns a one-hot Float64Array for the chosen action.
 */
function sampleAction(
  probabilities: Float64Array,
  rng: () => number
): Float64Array {
  const action = new Float64Array(probabilities.length)
  const r = rng()
  let cumulative = 0
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i] as number
    if (r < cumulative) {
      action[i] = 1
      return action
    }
  }
  // Fallback: choose last action (handles floating point rounding)
  action[probabilities.length - 1] = 1
  return action
}

/**
 * For non-softmax activations (sigmoid, tanh), treat outputs as independent
 * probabilities. Return the activated values directly as the action and
 * use them as action probabilities.
 */
function continuousAction(activated: Float64Array): Float64Array {
  return activated
}

/** EpisodicAgent extended with transition metadata support for plugin use. */
export type ACAgent = EpisodicAgent & {
  /** Set pending transition metadata (`info`) for the current transition. */
  setTransitionInfo(info: TransitionInfo): void
}

/**
 * Create an Actor-Critic EpisodicAgent (A2C pattern).
 *
 * The agent wraps a TrainableExecutor with N+1 outputs (N actor + 1 critic).
 * - act(): forward pass -> separate critic -> apply activation -> sample action -> record Transition
 * - reward(): record reward on current Transition, check trigger conditions
 * - startEpisode(): reset RolloutBuffer
 * - endEpisode(): flush buffer, train on remaining Transitions
 *
 * Training happens on RolloutSegments (event-triggered), not per frame.
 */
export function createACAgent(
  trainable: TrainableExecutor,
  config: ACAgentConfig,
  rng: () => number
): ACAgent {
  const rolloutBuffer = new RolloutBuffer(config.rolloutConfig)
  const activation = config.actorActivation ?? 'sigmoid'
  const rewardThreshold = config.rolloutConfig.rewardThreshold
  let currentTransition: Transition | null = null
  let pendingInfo: TransitionInfo | null = null

  const trainConfig = {
    ...config.gradientConfig,
    learningRate: config.learningRate,
  }

  function doTrain(): void {
    const trigger = determineTrigger()
    if (trigger === null) {
      return
    }
    const segment = rolloutBuffer.capture(trigger)
    if (segment !== null) {
      trainOnSegment(trainable, segment.transitions, trainConfig)
      config.onSegmentTrained?.(segment)
    }
  }

  function determineTrigger(): 'reward' | 'done' | 'info' | null {
    if (currentTransition === null) {
      return null
    }
    if (currentTransition.done) {
      return 'done'
    }
    if (Math.abs(currentTransition.reward) > rewardThreshold) {
      return 'reward'
    }
    if (pendingInfo?.isInteresting) {
      return 'info'
    }
    return null
  }

  return {
    act(inputs: Float64Array): Float64Array {
      // 1. Forward pass -> rawOutput (N+1 values, all linear)
      const rawOutput = trainable.forward(inputs)

      // 2. Pop last output as criticValue
      const actionCount = config.actionCount
      const criticValue = rawOutput[actionCount] as number

      // 3. Copy actor raw outputs and apply activation
      const actorRaw = new Float64Array(actionCount)
      for (let i = 0; i < actionCount; i++) {
        actorRaw[i] = rawOutput[i] as number
      }
      const actionProbabilities = applyActorActivation(actorRaw, activation)

      // 4. Sample action from probabilities (stochastic) or use continuous
      let action: Float64Array
      if (activation === 'softmax') {
        action = sampleAction(actionProbabilities, rng)
      } else {
        action = continuousAction(actionProbabilities)
      }

      // 5. Record Transition into RolloutBuffer
      currentTransition = {
        state: Float64Array.from(inputs),
        rawOutput: Float64Array.from(rawOutput),
        action,
        actionProbabilities,
        criticValue,
        reward: 0,
        done: false,
      }
      if (pendingInfo !== null) {
        currentTransition.info = pendingInfo
      }
      pendingInfo = null
      rolloutBuffer.push(currentTransition)

      // 6. Return action (N values - environment never sees the critic)
      return action
    },

    reward(reward: number, done: boolean): void {
      if (currentTransition === null) {
        return
      }
      currentTransition.reward = reward
      currentTransition.done = done

      doTrain()
    },

    startEpisode(info: EpisodeInfo): void {
      rolloutBuffer.reset(info.episodeIndex)
      currentTransition = null
      pendingInfo = null
    },

    endEpisode(_result: EpisodeResult): void {
      if (currentTransition !== null && rolloutBuffer.length > 0) {
        const segment = rolloutBuffer.capture('done')
        if (segment !== null) {
          trainOnSegment(trainable, segment.transitions, trainConfig)
          config.onSegmentTrained?.(segment)
        }
      }
      currentTransition = null
      pendingInfo = null
    },

    setTransitionInfo(info: TransitionInfo): void {
      pendingInfo = info
      if (currentTransition !== null) {
        currentTransition.info = info
      }
    },
  }
}
