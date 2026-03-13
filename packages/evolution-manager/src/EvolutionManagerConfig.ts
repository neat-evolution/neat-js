import type {
  Algorithm,
  AlgorithmContext,
  ConfigDataOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  LinkDataOf,
  NodeHiddenDataOf,
  StateDataOf,
} from '@neat-evolution/core'
import type { EnvironmentConfig } from '@neat-evolution/environment'
import type {
  EvaluationPlugin,
  EvaluationStrategy,
} from '@neat-evolution/evaluation-strategy'
import type {
  EvolutionOptions,
  PopulationCreator,
  PopulationFactoryOptions,
  PopulationOptions,
} from '@neat-evolution/evolution'

export interface WorkerConfig {
  /** Module path to the environment factory (for worker reconstruction).
   *  Workers call `import(createEnvironmentPathname)` to load the factory. */
  createEnvironmentPathname: string

  /** Module path to the algorithm (for worker-reproducer genome reconstruction).
   *  Default: algorithm.pathname (works in Node).
   *  In Vite: override with a path resolved via import.meta.glob(). */
  algorithmPathname?: string

  /** Module path to the executor factory.
   *  Default: '@neat-evolution/executor' */
  createExecutorPathname?: string

  /** Number of worker threads. Default: hardwareConcurrency - 1 */
  threadCount?: number

  /** Number of evaluation tasks per generation. Default: populationSize */
  taskCount?: number

  /** Strategy plugin paths to load on workers */
  pluginPaths?: string[]

  /** Worker script URLs for Vite compatibility.
   *  In Vite: import with `?worker&url` suffix.
   *  In Node: not needed (uses default worker script). */
  evaluatorWorkerScriptUrl?: URL | string
  reproducerWorkerScriptUrl?: URL | string

  /** Enable verbose logging */
  verbose?: boolean
}

export type EvaluationConfig =
  | {
      /** Use a plain evaluation strategy (default). */
      type: 'strategy'
      strategy?: EvaluationStrategy
    }
  | {
      /** Compose augmentation plugins (e.g., RL agents) around evaluation. */
      type: 'plugin-augmentation'
      plugins: ReadonlyArray<EvaluationPlugin>
    }
  | {
      /** Replace evaluation entirely with a single replacement plugin. */
      type: 'plugin-replacement'
      plugin: EvaluationPlugin
    }

export interface EvolutionManagerConfig<
  Ctx extends AlgorithmContext = AlgorithmContext,
> {
  /** The algorithm to use (NEATAlgorithm, CPPNAlgorithm, etc.) */
  algorithm: Algorithm<Ctx> & PopulationCreator<Ctx>

  /** The environment providing fitness evaluation.
   *  When using workers, only `description` and `toFactoryOptions()` are needed —
   *  workers reconstruct the real environment from the factory options.
   *  For local evaluation (no workerConfig), pass a full Environment with evaluate methods. */
  environment: EnvironmentConfig

  /**
   * Explicit evaluation pipeline selection.
   * - { type: 'strategy' } delegates fully to the provided strategy (or defaults).
   * - { type: 'plugin-augmentation' } installs RL plugins that wrap evaluation.
   * - { type: 'plugin-replacement' } hands evaluation to a single replacement plugin.
   */
  evaluation?: EvaluationConfig

  /**
   * @deprecated Use `evaluation: { type: 'strategy', strategy }` instead.
   * Retained for backward compatibility with pre-Phase 4 callers.
   */
  strategy?: EvaluationStrategy

  /** Evaluation plugins that augment or replace per-genome evaluation.
   *  When provided, a PluginStrategy wraps the evaluation pipeline.
   *  Plugins are initialized once during init() and receive lifecycle hooks. */
  plugins?: EvaluationPlugin[]

  /** Evolution loop settings (iterations, secondsLimit, callbacks, etc.) */
  evolutionOptions?: Partial<EvolutionOptions>

  /** Population structure settings */
  populationOptions?: Partial<PopulationOptions>

  /** Algorithm-specific config data, passed to Algorithm.createPopulation().
   *  Defaults to algorithm-specific defaults (e.g., { neat: defaultNEATConfigOptions }).
   *  Shape depends on the algorithm:
   *  - NEAT/CPPN/HyperNEAT/ES-HyperNEAT: { neat: NEATConfigOptions }
   *  - DES-HyperNEAT: { neat: NEATConfigOptions, cppn: NEATConfigOptions } */
  configData?: ConfigDataOf<Ctx>

  /** Algorithm-specific genome options. Defaults to algorithm.defaultOptions. */
  genomeOptions?: GenomeOptionsOf<Ctx>

  /** Previously saved population state for restoring a population.
   *  Obtained from `getPopulationData().factoryOptions` or `Population.toFactoryOptions()`.
   *  When provided, the population is hydrated from this state instead of creating fresh organisms. */
  populationFactoryOptions?: PopulationFactoryOptions<
    ConfigDataOf<Ctx>,
    StateDataOf<Ctx>,
    NodeHiddenDataOf<Ctx>,
    LinkDataOf<Ctx>,
    GenomeFactoryOptionsOf<Ctx>,
    GenomeOptionsOf<Ctx>
  >

  /** Worker configuration. Required for any practical use case.
   *  Omit only for unit tests or trivial single-threaded experiments. */
  workerConfig?: WorkerConfig

  /** AbortSignal for cancelling evolution mid-run. */
  signal?: AbortSignal
}
