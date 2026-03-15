import type { InitConfig } from '@neat-evolution/core'
import type { StaticExecutor } from '@neat-evolution/executor'
import type { RNG } from '@neat-evolution/utils'

export type EnvironmentDescription = InitConfig

/**
 * Minimal environment interface: just metadata and serialization.
 * Sufficient for worker-based evaluation where the main thread never
 * calls evaluate() — workers reconstruct the real environment from
 * toFactoryOptions().
 *
 * Browser apps can pass this instead of a full Environment when using workers.
 */
export interface EnvironmentConfig<EFO = unknown> {
  description: EnvironmentDescription
  toFactoryOptions: () => EFO
}

/**
 * Full environment interface with evaluation methods.
 * Required for local (non-worker) evaluation.
 */
export interface Environment<EFO = unknown> extends EnvironmentConfig<EFO> {
  /** Force async evaluation in the evaluator */
  isAsync: boolean
  evaluate: (executor: StaticExecutor, rng?: RNG) => number
  evaluateAsync: (executor: StaticExecutor, rng?: RNG) => Promise<number>
  evaluateBatch?: (executors: StaticExecutor[], rng?: RNG) => number[]
  evaluateBatchAsync?: (
    executors: StaticExecutor[],
    rng?: RNG
  ) => Promise<number[]>
}

export type StandardEnvironment<EFO = unknown> = Environment<EFO>
