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
  strategy?: EvaluationStrategy

  /**
   * Max number of hydrated executors to retain per worker for batch evaluation.
   * Disabled by default because individual-style evaluation does not usually
   * reuse executors enough to offset the additional memory cost.
   */
  executorCacheMaxSize?: number

  /**
   * URL to the worker script. Required for Vite compatibility.
   * In Vite, use: new URL('./path/to/workerEvaluatorScript.js', import.meta.url)
   * directly at the call site to ensure proper bundling.
   */
  workerScriptUrl?: URL | string

  /**
   * Module paths for strategy plugins to load on worker threads.
   * Each module must default-export a function matching WorkerPluginInit.
   * Plugins are loaded after INIT_EVALUATOR, before any evaluation.
   */
  pluginPaths?: string[]

  /**
   * Opaque config blob forwarded to worker plugins during initialization.
   * Plugins read their configuration from this object (keyed by plugin concern).
   * For RL: `{ rl: RLTrainingConfig }`.
   */
  pluginData?: Record<string, unknown>

  /** Enable verbose logging */
  verbose?: boolean
}
