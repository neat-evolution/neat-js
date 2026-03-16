export interface RuntimeConfig {
  /** Module path to the executor factory.
   *  Default: '@neat-evolution/executor' */
  createExecutorPathname?: string

  /** Map of field names to module pathnames for hydration.
   *  Each entry is dynamically imported and injected into
   *  EnvironmentRuntimeOptions under the given field name. */
  hydrateEnvironmentOptions?: Record<string, string>

  /** Serializable runtime data merged into EnvironmentRuntimeOptions.
   *  Use for factory options and config blobs.
   *  Functions (factories) go via hydrateEnvironmentOptions instead. */
  environmentRuntimeData?: Record<string, unknown>
}
