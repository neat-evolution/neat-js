import type { FitnessData } from '@neat-js/evaluator'

export interface WorkerEvaluatorOptions {
  /** path to module that exports createEnvironment */
  createEnvironmentPathname: string
  /** path to module that exports createExecutor */
  createExecutorPathname: string
  /** Population.size */
  taskCount: number
  /** os.cpus() */
  threadCount: number
}

export interface RequestMapValue {
  resolve: (value: FitnessData | PromiseLike<FitnessData>) => void
  reject: (reason?: any) => void
}
