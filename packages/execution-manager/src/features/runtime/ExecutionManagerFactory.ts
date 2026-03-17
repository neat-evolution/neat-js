import type { Executor } from '@neat-evolution/executor'
import type { PartialEvaluationContext } from './EnvironmentRuntimeOptions.js'

export type ExecutionManagerFactoryOptions = Record<string, unknown>

export type ExecutionManagerFactory<
  TExecutionManager = unknown,
  TFactoryOptions = ExecutionManagerFactoryOptions,
  TExecutor extends Executor = Executor,
> = (
  executor: TExecutor,
  options: TFactoryOptions,
  context?: PartialEvaluationContext
) => TExecutionManager
