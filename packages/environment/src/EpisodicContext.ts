import type { Executor } from '@neat-evolution/executor'
import type { EpisodeInfo, EpisodeResult } from './EpisodicAgent.js'

/** Environment-provided transition metadata (`info` in standard RL terms). */
export interface TransitionInfo {
  /** Short label for the domain event that just occurred (e.g., 'kill'). */
  eventLabel?: string
  /** Optional domain tags (e.g., ['danger-zone', 'boss-phase']). */
  tags?: readonly string[]
  /** Whether the environment considers this transition interesting,
   *  independent of reward (e.g., near miss, entered danger zone). */
  isInteresting?: boolean
  /** Situation class for deduplication (e.g., rock density bucket).
   *  When set, the agent can skip training on segments whose situation class
   *  is already well-represented in recent training. */
  situationClass?: number
  /** Free-form metadata for domain hints (clamped/normalized before use). */
  metadata?: Record<string, unknown>
}

/** Provided by RL plugin, consumed by environment during evaluate(). */
export interface EpisodicContext {
  /** Record reward for current transition. May trigger rollout capture + training. */
  reward?(executor: Executor, reward: number, done: boolean): void
  /** Signal episode start. Resets rollout buffer. */
  episodeStart?(executor: Executor, info: EpisodeInfo): void
  /** Signal episode end. Flushes rollout buffer, trains on remaining transitions. */
  episodeEnd?(executor: Executor, result: EpisodeResult): void
  /** Environment provides per-transition metadata (`info`) for capture decisions.
   *  Must be called before or alongside reward() so the same transition carries info. */
  transitionInfo?(executor: Executor, info: TransitionInfo): void
}
