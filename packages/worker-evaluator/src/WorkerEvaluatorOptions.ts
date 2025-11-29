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

  /**
   * URL to the worker script. Required for Vite compatibility.
   * In Vite, use: new URL('./path/to/workerEvaluatorScript.js', import.meta.url)
   * directly at the call site to ensure proper bundling.
   */
  workerScriptUrl?: URL | string

  /** Enable verbose logging */
  verbose?: boolean
}
