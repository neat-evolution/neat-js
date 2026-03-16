import type { StaticExecutor } from '@neat-evolution/executor'
import type {
  EpisodicAgentOptions,
  TransitionInfo,
} from './EpisodicAgentOptions.js'

/** Episode start metadata. */
export interface EpisodeInfo {
  /** Episode index within the current evaluation (0-based). */
  episodeIndex: number
  /**
   * Episode bucket or label (e.g., 'scenario', 'full-game', 'curriculum').
   * Policies that behave differently per episode slot must encode this
   * signal inside their observation features.
   */
  type?: string
  /** Optional curriculum or gauntlet phase (e.g., 'stage-2', 'final'). */
  phase?: string
  /** Episode-specific metadata (seed, scenario config, gauntlet context). */
  metadata?: Record<string, unknown>
}

/** Episode completion result. */
export interface EpisodeResult {
  /** Episode fitness/score (per-episode contribution to final fitness). */
  fitness: number
  /**
   * Episode return (cumulative reward emitted by the environment for this
   * episode). This is the learning signal for the RL agent.
   */
  episodeReturn: number
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
  /**
   * Record reward for the current transition. Reward is per-transition,
   * not aggregated. Agents integrate rewards internally to compute
   * returns/advantages.
   */
  reward(reward: number, terminated: boolean, truncated: boolean): void
  /** Reset state for a new episode. */
  startEpisode(info: EpisodeInfo): void
  /**
   * Flush rollout buffer, train on remaining transitions, and optionally use
   * the reported episode return/fitness for telemetry.
   */
  endEpisode(result: EpisodeResult): void
  /** Set pending transition metadata (`info`) for the current transition. */
  setTransitionInfo(info: TransitionInfo): void
}

/**
 * Creates an EpisodicAgent wrapping an executor.
 * Without options: vanilla agent (no-op hooks, just forwards execute() calls).
 * With options: RL-capable agent (hooks wire up rollout capture + training).
 */
export function createEpisodicAgent(
  executor: StaticExecutor,
  options?: EpisodicAgentOptions
): EpisodicAgent {
  return {
    act(inputs: Float64Array): Float64Array {
      const output = executor.forward(inputs)
      return output instanceof Float64Array ? output : Float64Array.from(output)
    },
    reward(reward: number, terminated: boolean, truncated: boolean): void {
      options?.reward?.(executor, reward, terminated, truncated)
    },
    startEpisode(info: EpisodeInfo): void {
      options?.episodeStart?.(executor, info)
    },
    endEpisode(result: EpisodeResult): void {
      options?.episodeEnd?.(executor, result)
    },
    setTransitionInfo(info: TransitionInfo): void {
      options?.transitionInfo?.(executor, info)
    },
  }
}
