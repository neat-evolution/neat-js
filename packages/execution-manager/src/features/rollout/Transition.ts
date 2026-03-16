import type { TransitionInfo } from '../agent/EpisodicContext.js'

/** A single (s, a, r, s', done) record, extended with value estimates and metadata. */
export interface Transition {
  /** Input state (observation). */
  state: Float64Array
  /** Raw network output (before activation). */
  rawOutput: Float64Array
  /** Action taken (post-activation, post-critic-separation). */
  action: Float64Array
  /** Reward received after taking action. */
  reward: number
  /** Whether this transition ended the episode. */
  done: boolean

  // -- AC-specific fields (undefined for QL) --
  /** Action probabilities from softmax (AC only). */
  actionProbabilities?: Float64Array
  /** Critic's value estimate V(s) (AC only). */
  criticValue?: number

  // -- QL-specific fields (undefined for AC) --
  /** Q-values for all actions (QL only). */
  qValues?: Float64Array
  /** Index of chosen action (QL only, for epsilon-greedy). */
  chosenActionIndex?: number

  // -- Shared optional fields --
  /** Environment-provided transition metadata (`info` in RL terms). */
  info?: TransitionInfo
}

/** A contiguous slice of transitions captured for training. */
export interface RolloutSegment {
  /** The transitions in this segment. */
  transitions: Transition[]
  /** What triggered this capture. */
  trigger: 'reward' | 'done' | 'info'
  /** Episode index this segment belongs to. */
  episodeIndex: number
}

/** Configuration for rollout capture behavior. */
export interface RolloutBufferConfig {
  /** Rollout length (truncated rollout). Number = fixed window (A2C/PPO-style).
   *  'episode' = full-episode collection (standard episodic RL).
   *  Default: 32 */
  rolloutLength: number | 'episode'
  /** Minimum transitions before training is triggered.
   *  Prevents tiny rollouts from rapid event clusters.
   *  Default: 1 (no minimum). Hexagonoids recommendation: 16. */
  minRolloutLength?: number
  /** Minimum |reward| to trigger capture. Default: 0.1 */
  rewardThreshold: number
}
