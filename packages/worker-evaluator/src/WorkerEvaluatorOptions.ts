import type { EvaluationStrategy } from '@neat-evolution/evaluation-strategy'
import type { StatsRecorder } from '@neat-evolution/stats'

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

  /** Optional stats recorder for evaluation-level metrics.
   *  When provided, workers receive the recorder's `toJSON()` config
   *  and create a WorkerStatsRecorder that bridges records back. */
  stats?: StatsRecorder

  /** Map of field names to module pathnames for worker-side hydration.
   *  Each entry is dynamically imported on the worker and injected into
   *  EnvironmentRuntimeOptions under the given field name. */
  hydrateEnvironmentOptions?: Record<string, string>

  /** Serializable runtime data merged into EnvironmentRuntimeOptions on workers.
   *  Use for factory options and config blobs (functions go via hydrateEnvironmentOptions). */
  environmentRuntimeData?: Record<string, unknown>

  /** Enable verbose logging */
  verbose?: boolean
}
