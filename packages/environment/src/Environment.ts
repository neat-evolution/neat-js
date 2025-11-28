import type { InitConfig } from '@neat-evolution/core'
import type { Executor, SyncExecutor } from '@neat-evolution/executor'
import type { RNG } from '@neat-evolution/utils'

export type EnvironmentDescription = InitConfig

export interface Environment<EFO> {
  description: EnvironmentDescription
  /** Force async evaluation in the evaluator */
  isAsync: boolean
  evaluate: (executor: SyncExecutor, rng?: RNG) => number
  evaluateAsync: (executor: Executor, rng?: RNG) => Promise<number>
  evaluateBatch: (executors: SyncExecutor[], rng?: RNG) => number[]
  evaluateBatchAsync: (executors: Executor[], rng?: RNG) => Promise<number[]>
  toFactoryOptions: () => EFO
}
