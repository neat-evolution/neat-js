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
import type { EvaluationStrategy } from '@neat-evolution/evaluation-strategy'
import type { RuntimeConfig } from '@neat-evolution/evaluator'
import type {
  EvolutionOptions,
  PopulationCreator,
  PopulationFactoryOptions,
  PopulationOptions,
} from '@neat-evolution/evolution'
import type { StatsRecorder } from '@neat-evolution/stats'

export interface EvaluatorConfig extends RuntimeConfig {
  /** Module path to the algorithm (for worker-reproducer genome reconstruction).
   *  Default: algorithm.pathname (works in Node).
   *  In Vite: override with a path resolved via import.meta.glob(). */
  algorithmPathname?: string

  /** Number of worker threads. Default: hardwareConcurrency - 1 */
  threadCount?: number

  /** Number of evaluation tasks per generation. Default: populationSize */
  taskCount?: number

  /** Worker script URLs for Vite compatibility.
   *  In Vite: import with `?worker&url` suffix.
   *  In Node: not needed (uses default worker script). */
  evaluatorWorkerScriptUrl?: URL | string
  reproducerWorkerScriptUrl?: URL | string

  /** Enable verbose logging */
  verbose?: boolean
}

export interface EvolutionManagerConfig<
  Ctx extends AlgorithmContext = AlgorithmContext,
> {
  /** The algorithm to use (NEATAlgorithm, CPPNAlgorithm, etc.) */
  algorithm: Algorithm<Ctx> & PopulationCreator<Ctx>

  /** The environment providing fitness evaluation.
   *  Workers reconstruct the environment on each thread from factory options.
   *  The `description` and `toFactoryOptions()` methods are always used. */
  environment: EnvironmentConfig

  /** Module path to the environment factory.
   *  Workers call `import(createEnvironmentPathname)` to load the factory
   *  and reconstruct the environment on each thread. */
  createEnvironmentPathname: string

  /** Evaluation strategy for orchestrating genome evaluation.
   *  Omit for default individual evaluation. */
  strategy?: EvaluationStrategy

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

  /** Optional evaluator tuning: executor hydration, worker threading, etc.
   *  Worker evaluation is always used. These settings override defaults. */
  evaluatorConfig?: EvaluatorConfig

  /** Stats recorder for generation/run-summary and evaluation-level metrics.
   *  The recorder's `toJSON()` config is sent to workers so they can create
   *  a WorkerStatsRecorder that bridges records back to the main thread. */
  stats?: StatsRecorder

  /** AbortSignal for cancelling evolution mid-run. */
  signal?: AbortSignal
}
