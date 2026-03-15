import { RolloutBuffer } from '@neat-evolution/actor-critic'
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
import type { RNG } from '@neat-evolution/utils'
import type { QLGradientConfig } from './computeQLOutputErrors.js'
import { trainOnSegment } from './trainOnSegment.js'

/** Configuration for the QL agent factory. */
export interface QLAgentConfig {
  /** Learning rate for backward pass. */
  learningRate: number
  /** Number of actions (standard mode) or action factors (multi-discrete mode). */
  actionCount: number
  /** Discount factor (gamma). */
  discountFactor: number
  /** Rollout buffer configuration (shared with AC). */
  rolloutConfig: RolloutBufferConfig
  /** Initial epsilon at the start of a genome evaluation. */
  epsilonInitial: number
  /** Multiplicative decay applied after each episode finishes. */
  epsilonDecayPerEpisode?: number
  /** Minimum epsilon floor. */
  epsilonMinimum?: number
  /** Multi-discrete mode: treat outputs as pairs [Q_on, Q_off] per factor. */
  multiDiscrete?: boolean
  /** Optional callback invoked whenever a rollout segment trains (telemetry). */
  onSegmentTrained?: (segment: RolloutSegment) => void
}

/** QL agent with transition metadata support for plugin integration. */
export type QLAgent = EpisodicAgent & {
  /** Set pending transition metadata (`info`) for the current transition. */
  setTransitionInfo(info: TransitionInfo): void
}

/**
 * Create a Q-learning (DQN-style) EpisodicAgent.
 *
 * During rollout collection (act()):
 *   - Forward pass to get Q-values
 *   - Epsilon-greedy action selection
 *   - Record transition in rollout buffer
 *
 * During training (triggered by reward events or episode end):
 *   - Capture rollout segment from buffer
 *   - Compute n-step returns backward through segment
 *   - Backward pass per transition with TD error at chosen action
 *
 * Standard mode: actionCount outputs = Q-values for N discrete actions
 * Multi-discrete mode: 2 * actionCount outputs = Q-values for each factor's on/off
 *
 * No critic output needed -- Q-values ARE the value estimates.
 */
export function createQLAgent(
  trainable: TrainableExecutor,
  config: QLAgentConfig,
  rng: RNG
): QLAgent {
  const rolloutBuffer = new RolloutBuffer(config.rolloutConfig)
  const multiDiscrete = config.multiDiscrete ?? false
  const actionCount = config.actionCount
  const rewardThreshold = config.rolloutConfig.rewardThreshold
  const epsilonDecayPerEpisode = config.epsilonDecayPerEpisode ?? 1
  const epsilonMinimum = config.epsilonMinimum ?? 0

  let epsilon = config.epsilonInitial
  let episodesStarted = 0
  let currentTransition: Transition | null = null
  let pendingInfo: TransitionInfo | null = null

  const gradientConfig: QLGradientConfig = {
    discountFactor: config.discountFactor,
    learningRate: config.learningRate,
  }

  function doTrain(): void {
    const trigger = determineTrigger()
    if (trigger === null) {
      return
    }
    const segment = rolloutBuffer.capture(trigger)
    if (segment !== null) {
      trainOnSegment(
        trainable,
        segment.transitions,
        gradientConfig,
        multiDiscrete,
        actionCount
      )
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

  /**
   * Epsilon-greedy action selection for standard mode (N discrete actions).
   * Returns one-hot encoded action and the chosen action index.
   */
  function selectActionStandard(qValues: Float64Array): {
    action: Float64Array
    chosenActionIndex: number
  } {
    const action = new Float64Array(actionCount)
    let chosenActionIndex: number

    if (rng.gen() < epsilon) {
      // Random exploration
      chosenActionIndex = rng.genRange(0, actionCount)
    } else {
      // Greedy: argmax of Q-values
      chosenActionIndex = 0
      let maxQ = qValues[0] as number
      for (let i = 1; i < actionCount; i++) {
        const q = qValues[i] as number
        if (q > maxQ) {
          maxQ = q
          chosenActionIndex = i
        }
      }
    }

    action[chosenActionIndex] = 1
    return { action, chosenActionIndex }
  }

  /**
   * Epsilon-greedy action selection for multi-discrete mode.
   * Each factor pair has independent epsilon-greedy selection.
   * Returns N-length action array (0 or 1 per factor).
   */
  function selectActionMultiDiscrete(qValues: Float64Array): Float64Array {
    const action = new Float64Array(actionCount)

    for (let b = 0; b < actionCount; b++) {
      if (rng.gen() < epsilon) {
        // Random: pick on or off
        action[b] = rng.genBool() ? 1 : 0
      } else {
        // Greedy: pick the action with higher Q-value in the pair
        const qOn = qValues[2 * b] as number
        const qOff = qValues[2 * b + 1] as number
        action[b] = qOn >= qOff ? 1 : 0
      }
    }

    return action
  }

  return {
    act(inputs: Float64Array): Float64Array {
      // 1. Forward pass -> Q-values (all outputs are Q-values, no critic)
      const rawOutput = trainable.forward(inputs)
      const qValues = Float64Array.from(rawOutput)

      // 2. Epsilon-greedy action selection
      let action: Float64Array
      let chosenActionIndex: number | undefined

      if (multiDiscrete) {
        action = selectActionMultiDiscrete(qValues)
        // In multi-discrete mode, chosenActionIndex is not stored.
        // Training derives each chosen factor action from the action array.
      } else {
        const result = selectActionStandard(qValues)
        action = result.action
        chosenActionIndex = result.chosenActionIndex
      }

      // 3. Compute max Q-value for bootstrap
      // (not stored on Transition — derived from qValues at training time)

      // 4. Record Transition into RolloutBuffer
      const transition: Transition = {
        state: Float64Array.from(inputs),
        rawOutput: Float64Array.from(rawOutput),
        action,
        qValues,
        reward: 0,
        done: false,
      }
      if (chosenActionIndex !== undefined) {
        transition.chosenActionIndex = chosenActionIndex
      }
      currentTransition = transition
      if (pendingInfo !== null) {
        transition.info = pendingInfo
      }
      pendingInfo = null
      rolloutBuffer.push(transition)

      // 5. Return action (N values for environment)
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

      if (episodesStarted === 0) {
        epsilon = config.epsilonInitial
      } else {
        epsilon = Math.max(epsilonMinimum, epsilon * epsilonDecayPerEpisode)
      }
      episodesStarted += 1
    },

    endEpisode(_result: EpisodeResult): void {
      if (currentTransition !== null && rolloutBuffer.length > 0) {
        const segment = rolloutBuffer.capture('done')
        if (segment !== null) {
          trainOnSegment(
            trainable,
            segment.transitions,
            gradientConfig,
            multiDiscrete,
            actionCount
          )
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
