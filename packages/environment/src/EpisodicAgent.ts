import type { SyncExecutor } from '@neat-evolution/executor'
import type { EpisodicContext } from './EpisodicContext.js'

/** Episode start metadata. */
export interface EpisodeInfo {
  /** Episode index within the current evaluation (0-based). */
  episodeIndex: number
  /** Environment-specific episode type (e.g., 'scenario', 'full-game', 'curriculum'). */
  type?: string
  /** Episode-specific metadata (e.g., scenario config, seed). */
  metadata?: Record<string, unknown>
}

/** Episode completion result. */
export interface EpisodeResult {
  /** Episode fitness/score. */
  fitness: number
  /** Total steps in this episode. */
  totalSteps: number
  /** Whether the episode ended early (death, timeout). */
  terminated: boolean
  /** Environment-specific result data. */
  metadata?: Record<string, unknown>
}

/** The generic RL agent wrapper. All RL methods implement this. */
export interface EpisodicAgent {
  /** Forward pass + record transition in rollout buffer. */
  act(inputs: Float64Array): Float64Array
  /** Record reward for current transition. May trigger training. */
  reward(reward: number, done: boolean): void
  /** Reset state for a new episode. */
  startEpisode(info: EpisodeInfo): void
  /** Flush rollout buffer, train on remaining transitions. */
  endEpisode(result: EpisodeResult): void
}

/**
 * Creates an EpisodicAgent wrapping an executor.
 * Without context: vanilla agent (no-op hooks, just forwards execute() calls).
 * With context: RL-capable agent (hooks wire up rollout capture + training).
 */
export function createEpisodicAgent(
  executor: SyncExecutor,
  context?: EpisodicContext
): EpisodicAgent {
  return {
    act(inputs: Float64Array): Float64Array {
      const output = executor.execute(inputs)
      return output instanceof Float64Array ? output : Float64Array.from(output)
    },
    reward(reward: number, done: boolean): void {
      context?.reward?.(executor, reward, done)
    },
    startEpisode(info: EpisodeInfo): void {
      context?.episodeStart?.(executor, info)
    },
    endEpisode(result: EpisodeResult): void {
      context?.episodeEnd?.(executor, result)
    },
  }
}
