import type {
  EpisodeInfo,
  EpisodeResult,
  EpisodicAgent,
  RolloutBufferConfig,
  RolloutSegment,
  Transition,
  TransitionInfo,
} from '@neat-evolution/environment'
import type { TrainableExecutor } from '@neat-evolution/executor'
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

/** EpisodicAgent extended with transition metadata support for plugin use. */
export type ACAgent = EpisodicAgent & {
  /** Set pending transition metadata (`info`) for the current transition. */
  setTransitionInfo(info: TransitionInfo): void
}

/**
 * Create an Actor-Critic EpisodicAgent (A2C pattern).
 *
 * The agent wraps a TrainableExecutor with N+1 outputs (N actor + 1 critic).
 * The executor handles output activation directly (per-group Softmax for actor,
 * Linear for critic). The agent reads probabilities from the executor output.
 *
 * - act(): forward pass -> separate critic -> sample action -> record Transition
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
      // 1. Forward pass -> output (N+1 values, executor handles activations)
      const output = trainable.forward(inputs)

      // 2. Pop last output as criticValue
      const actionCount = config.actionCount
      const criticValue = output[actionCount] as number

      // 3. Read actor outputs directly as action probabilities
      //    (executor already applied per-group Softmax normalization)
      const actionProbabilities = new Float64Array(actionCount)
      for (let i = 0; i < actionCount; i++) {
        actionProbabilities[i] = output[i] as number
      }

      // 4. Sample action from probabilities (stochastic)
      const action = sampleAction(actionProbabilities, rng)

      // 5. Record Transition into RolloutBuffer
      currentTransition = {
        state: Float64Array.from(inputs),
        rawOutput: Float64Array.from(output),
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
