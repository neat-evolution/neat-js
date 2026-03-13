/** RL configuration provided by episodic environments. */
export interface RLConfig {
  /** Number of action outputs the environment expects. */
  actionSize: number
  /** Recommended discount factor (γ). */
  discountFactor: number
  /** Maximum steps per episode (for timeout). */
  maxStepsPerEpisode?: number
  /** Environment's suggested rollout length. Plugin may override. */
  suggestedRolloutLength?: number | 'episode'
}

/** Environments that support episodic RL implement this alongside Environment. */
export interface EpisodicEnvironment {
  /** RL configuration for this environment. */
  getRLConfig(): RLConfig
}

/** Runtime type guard (matches SupervisedEnvironment pattern). */
export function isEpisodicEnvironment(
  env: unknown
): env is EpisodicEnvironment {
  return typeof env === 'object' && env !== null && 'getRLConfig' in env
}

/**
 * Environments that support direct agent evaluation.
 *
 * When an RL plugin creates an agent (AC or QL), the agent's act() method
 * handles forward passes, transition recording, and training internally.
 * The standard evaluation pipeline can't thread the agent through
 * (Environment.evaluate only receives a SyncExecutor, not an EpisodicAgent).
 *
 * Environments that implement AgentEnvironment expose evaluateAgent() so
 * plugins can pass the RL agent directly, bypassing the executor pipeline.
 */
export interface AgentEnvironment {
  evaluateAgent(agent: import('./EpisodicAgent.js').EpisodicAgent): number
}

/** Runtime type guard for direct agent evaluation environments. */
export function isAgentEnvironment(env: unknown): env is AgentEnvironment {
  return (
    typeof env === 'object' &&
    env !== null &&
    'evaluateAgent' in env &&
    typeof (env as Record<string, unknown>).evaluateAgent === 'function'
  )
}
