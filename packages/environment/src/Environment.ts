import type { InitConfig } from '@neat-evolution/core'
import type { PartialEvaluationContext } from '@neat-evolution/execution-manager'
import type { StaticExecutor } from '@neat-evolution/executor'

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
  evaluate: (
    executor: StaticExecutor,
    context?: PartialEvaluationContext
  ) => number
  evaluateAsync: (
    executor: StaticExecutor,
    context?: PartialEvaluationContext
  ) => Promise<number>
  evaluateBatch?: (
    executors: StaticExecutor[],
    context?: PartialEvaluationContext
  ) => number[]
  evaluateBatchAsync?: (
    executors: StaticExecutor[],
    context?: PartialEvaluationContext
  ) => Promise<number[]>
}

export type StandardEnvironment<EFO = unknown> = Environment<EFO>
