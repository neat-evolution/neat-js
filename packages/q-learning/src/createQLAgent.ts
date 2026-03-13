import { RolloutBuffer } from '@neat-evolution/actor-critic'
import type { TrainableExecutor } from '@neat-evolution/backprop'
import type {
  EpisodeInfo,
  EpisodeResult,
  EpisodicAgent,
  FrameAnnotation,
  RolloutBufferConfig,
  Transition,
} from '@neat-evolution/environment'
import type { QLGradientConfig } from './computeQLOutputErrors.js'
import { trainOnSegment } from './trainOnSegment.js'

/** Configuration for the QL agent factory. */
export interface QLAgentConfig {
  /** Learning rate for backward pass. */
  learningRate: number
  /** Number of actions (standard mode) or buttons (per-button mode). */
  actionCount: number
  /** Discount factor (gamma). */
  discountFactor: number
  /** Rollout buffer configuration (shared with AC). */
  rolloutConfig: RolloutBufferConfig
  /** Epsilon for exploration (probability of random action). */
  epsilon: number
  /** Epsilon decay multiplier per episode. */
  epsilonDecay?: number
  /** Minimum epsilon floor. */
  epsilonMin?: number
  /** Per-button mode: treat outputs as pairs [Q_on, Q_off]. */
  perButton?: boolean
}

/** QL agent: EpisodicAgent with an additional annotate side channel for plugins. */
export type QLAgent = EpisodicAgent & {
  /** Set a pending annotation for the current transition (plugin side channel). */
  annotate(annotation: FrameAnnotation): void
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
 * Per-button mode: 2 * actionCount outputs = Q-values for each button's on/off
 *
 * No critic output needed -- Q-values ARE the value estimates.
 */
export function createQLAgent(
  trainable: TrainableExecutor,
  config: QLAgentConfig,
  rng: () => number
): QLAgent {
  const rolloutBuffer = new RolloutBuffer(config.rolloutConfig)
  const perButton = config.perButton ?? false
  const actionCount = config.actionCount
  const rewardThreshold = config.rolloutConfig.rewardThreshold
  const epsilonDecay = config.epsilonDecay ?? 1
  const epsilonMin = config.epsilonMin ?? 0

  let epsilon = config.epsilon
  let currentTransition: Transition | null = null
  let pendingAnnotation: FrameAnnotation | null = null

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
        perButton,
        actionCount
      )
    }
  }

  function determineTrigger(): 'reward' | 'done' | 'annotation' | null {
    if (currentTransition === null) {
      return null
    }
    if (currentTransition.done) {
      return 'done'
    }
    if (Math.abs(currentTransition.reward) > rewardThreshold) {
      return 'reward'
    }
    if (pendingAnnotation?.isInteresting) {
      return 'annotation'
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

    if (rng() < epsilon) {
      // Random exploration
      chosenActionIndex = Math.floor(rng() * actionCount)
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
   * Epsilon-greedy action selection for per-button mode.
   * Each button pair has independent epsilon-greedy selection.
   * Returns N-length action array (0 or 1 per button).
   */
  function selectActionPerButton(qValues: Float64Array): Float64Array {
    const action = new Float64Array(actionCount)

    for (let b = 0; b < actionCount; b++) {
      if (rng() < epsilon) {
        // Random: pick on or off
        action[b] = rng() < 0.5 ? 1 : 0
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

      if (perButton) {
        action = selectActionPerButton(qValues)
        // In per-button mode, chosenActionIndex is not used on Transition
        // (we derive per-button choices from the action array during training)
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
      pendingAnnotation = null
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
      pendingAnnotation = null

      // Decay epsilon per episode
      epsilon = Math.max(epsilonMin, epsilon * epsilonDecay)
    },

    endEpisode(_result: EpisodeResult): void {
      if (currentTransition !== null && rolloutBuffer.length > 0) {
        const segment = rolloutBuffer.capture('done')
        if (segment !== null) {
          trainOnSegment(
            trainable,
            segment.transitions,
            gradientConfig,
            perButton,
            actionCount
          )
        }
      }
      currentTransition = null
      pendingAnnotation = null
    },

    annotate(annotation: FrameAnnotation): void {
      pendingAnnotation = annotation
    },
  }
}
