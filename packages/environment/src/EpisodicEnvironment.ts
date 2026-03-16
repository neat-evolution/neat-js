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
