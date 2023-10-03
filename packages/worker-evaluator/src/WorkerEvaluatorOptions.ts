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
