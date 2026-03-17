import type { StatsRecorder } from '@neat-evolution/stats'
import type { RNG } from '@neat-evolution/utils'
import type {
  ExecutionManagerFactory,
  ExecutionManagerFactoryOptions,
} from './ExecutionManagerFactory.js'
import type { WorkerEvaluationContext } from './WorkerEvaluationContext.js'

export interface EnvironmentInitOptions<
  TExecutionManagerFactory = ExecutionManagerFactory<unknown>,
  TExecutionManagerFactoryOptions = ExecutionManagerFactoryOptions,
> {
  createExecutionManager?: TExecutionManagerFactory
  executionManagerFactoryOptions?: TExecutionManagerFactoryOptions
  [key: string]: unknown // extensible for hydrated pathnames
}

/** Minimal evaluation context: just RNG + optional stats. Available everywhere. */
export interface BaseEvaluationContext {
  rng: RNG
  stats?: StatsRecorder
}

/** Partial worker context — required fields from Base, optional worker-specific fields. */
export type PartialEvaluationContext = Partial<WorkerEvaluationContext> &
  BaseEvaluationContext
