import type { Executor } from '@neat-evolution/executor'
import type { EpisodeInfo, EpisodeResult } from './EpisodicAgent.js'

/** Environment-provided per-transition metadata. */
export interface FrameAnnotation {
  /** Whether the environment considers this frame interesting,
   *  independent of reward (e.g., near miss, entered danger zone). */
  isInteresting?: boolean
  /** Situation classifier for deduplication (e.g., rock density bucket).
   *  When set, the agent can skip training on segments whose situation class
   *  is already well-represented in recent training. */
  situationClass?: number
}

/** Provided by RL plugin, consumed by environment during evaluate(). */
export interface EpisodicContext {
  /** Record reward for current transition. May trigger rollout capture + training. */
  reward?(executor: Executor, reward: number, done: boolean): void
  /** Signal episode start. Resets rollout buffer. */
  episodeStart?(executor: Executor, info: EpisodeInfo): void
  /** Signal episode end. Flushes rollout buffer, trains on remaining transitions. */
  episodeEnd?(executor: Executor, result: EpisodeResult): void
  /** Environment provides per-transition annotation for capture decisions. */
  annotateFrame?(executor: Executor, annotation: FrameAnnotation): void
}
