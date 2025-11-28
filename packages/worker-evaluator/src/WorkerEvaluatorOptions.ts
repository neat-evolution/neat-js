import type { EvaluationStrategy } from '@neat-evolution/evaluation-strategy'

export interface WorkerEvaluatorOptions {
  /** path to module that exports algorithm; Required on web for vite compatibility */
  algorithmPathname?: string

  /** path to module that exports createEnvironment */
  createEnvironmentPathname: string

  /** path to module that exports createExecutor */
  createExecutorPathname: string

  /** Population.size */
  taskCount: number

  /** os.cpus() */
  threadCount: number

  /**
   * Evaluation strategy to use for orchestrating genome evaluation.
   * Defaults to IndividualStrategy if not provided.
   */
  strategy?: EvaluationStrategy<any>

  /** Enable verbose logging */
  verbose?: boolean
}
