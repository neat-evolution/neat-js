import type {
  Algorithm,
  AlgorithmContext,
  AnyErasedAlgorithm,
  ConfigDataOf,
  ConfigFactoryOptionsOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  InitConfig,
  LinkDataOf,
  NodeHiddenDataOf,
  StateDataOf,
} from '@neat-evolution/core'
import type {
  Environment,
  EnvironmentConfig,
} from '@neat-evolution/environment'
import type { EvaluationStrategy } from '@neat-evolution/evaluation-strategy'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  EvolutionOptions,
  PopulationCreator,
  PopulationOptions,
  Reproducer,
} from '@neat-evolution/evolution'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
  evolve,
  Organism,
  type OrganismData,
  type Population,
  type PopulationData,
  type PopulationFactoryOptions,
} from '@neat-evolution/evolution'
import type { StaticExecutor } from '@neat-evolution/executor'
import { createExecutor } from '@neat-evolution/executor'
import type { StatsRecorder } from '@neat-evolution/stats'
import { createRNG, type RNG } from '@neat-evolution/utils'
import {
  createEvaluator as createWorkerEvaluator,
  type WorkerEvaluator,
  type WorkerEvaluatorOptions,
} from '@neat-evolution/worker-evaluator'
import {
  createReproducerFactory as createWorkerReproducerFactory,
  type Terminable,
  type WorkerReproducerOptions,
} from '@neat-evolution/worker-reproducer'
import { hardwareConcurrency } from '@neat-evolution/worker-threads'

import type {
  EvaluatorConfig,
  EvolutionManagerOptions,
} from './EvolutionManagerConfig.js'
import { createEvolutionManagerConfig } from './EvolutionManagerConfig.js'

const DEFAULT_EXECUTOR_PATHNAME = '@neat-evolution/executor'

export class EvolutionManager<Ctx extends AlgorithmContext = AlgorithmContext> {
  private readonly algorithm: Algorithm<Ctx> & PopulationCreator<Ctx>
  private readonly environment: EnvironmentConfig
  private readonly createEnvironmentPathname: string
  private readonly strategy: EvaluationStrategy | undefined
  private readonly evolutionOptions: EvolutionOptions
  private readonly populationOptions: PopulationOptions
  private readonly configData: ConfigDataOf<Ctx> | undefined
  private readonly genomeOptions: GenomeOptionsOf<Ctx>
  private readonly populationFactoryOptions:
    | PopulationFactoryOptions<
        ConfigDataOf<Ctx>,
        StateDataOf<Ctx>,
        NodeHiddenDataOf<Ctx>,
        LinkDataOf<Ctx>,
        GenomeFactoryOptionsOf<Ctx>,
        GenomeOptionsOf<Ctx>
      >
    | undefined
  private readonly evaluatorConfig: EvaluatorConfig | undefined
  private readonly rng: RNG
  private readonly stats: StatsRecorder | undefined
  private readonly signal: AbortSignal | undefined

  private readonly terminables = new Set<Terminable>()
  private population: Population<Ctx> | undefined
  private initialized = false
  private populationInitialized = false

  constructor(config: EvolutionManagerOptions<Ctx>) {
    const resolvedConfig = createEvolutionManagerConfig(config)
    if (resolvedConfig.algorithm == null) {
      throw new Error('EvolutionManager requires an algorithm')
    }
    if (resolvedConfig.environment == null) {
      throw new Error('EvolutionManager requires an environment')
    }

    this.algorithm = resolvedConfig.algorithm
    this.environment = resolvedConfig.environment
    this.createEnvironmentPathname = resolvedConfig.createEnvironmentPathname
    this.strategy = resolvedConfig.strategy
    this.evolutionOptions = {
      ...defaultEvolutionOptions,
      ...resolvedConfig.evolutionOptions,
    }
    this.populationOptions = {
      ...defaultPopulationOptions,
      ...resolvedConfig.populationOptions,
    }
    this.configData = resolvedConfig.configData
    const baseGenomeOptions =
      resolvedConfig.genomeOptions ??
      ({ ...resolvedConfig.algorithm.defaultOptions } as GenomeOptionsOf<Ctx>)
    // Auto-enable backprop tracking when an execution manager is configured
    this.genomeOptions =
      config.execution?.createExecutionManager != null
        ? ({
            ...baseGenomeOptions,
            enableBackprop: true,
          } as GenomeOptionsOf<Ctx>)
        : baseGenomeOptions
    this.populationFactoryOptions = resolvedConfig.populationFactoryOptions
    this.evaluatorConfig = resolvedConfig.evaluatorConfig
    this.rng = resolvedConfig.rng ?? createRNG()
    this.stats = resolvedConfig.stats
    this.signal = resolvedConfig.signal
  }

  /** Create evaluator, reproducer, population. Idempotent. */
  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    const effectiveStrategy = this.strategy

    const result = this.createWorkerFactories(effectiveStrategy)

    const evaluator: Evaluator = result.evaluator
    const createReproducer: (population: Population<Ctx>) => Reproducer =
      result.createReproducer

    this.population = this.algorithm.createPopulation(
      createReproducer,
      evaluator,
      this.configData as ConfigDataOf<Ctx>,
      this.populationOptions,
      this.genomeOptions,
      this.populationFactoryOptions
    )

    this.initialized = true
  }

  /** Run initial mutations + first evaluation. Call after init(). */
  async initializePopulation(): Promise<void> {
    if (this.populationInitialized) {
      return
    }
    if (!this.initialized) {
      await this.init()
    }

    const population = this.population
    if (population == null) {
      throw new Error('Population not created')
    }

    const initialMutations = this.evolutionOptions.initialMutations
    if (initialMutations > 0) {
      const initRng = this.rng.derive('initial-mutations')
      for (let i = 0; i < initialMutations; i++) {
        await population.mutate(initRng.derive(`round:${i}`))
      }
    }
    const initEvalRng = this.rng.derive('initial-evaluation')
    await population.evaluate(initEvalRng)

    this.populationInitialized = true
  }

  /** Run the evolution loop. Calls init() + initializePopulation() if needed.
   *  Can be called multiple times — population state persists between calls.
   *  Returns the best organism found. */
  async evolve(
    options?: Partial<EvolutionOptions>
  ): Promise<Organism<Ctx> | undefined> {
    if (!this.initialized) {
      await this.init()
    }
    if (!this.populationInitialized) {
      await this.initializePopulation()
    }

    const population = this.population
    if (population == null) {
      throw new Error('Population not created')
    }

    const evolveOptions: EvolutionOptions = {
      ...this.evolutionOptions,
      ...options,
      initialMutations: 0,
      rng: this.rng,
    }
    if (this.stats != null) {
      evolveOptions.stats = this.stats
    }
    if (this.signal != null) {
      evolveOptions.signal = this.signal
    }

    return evolve(population, evolveOptions)
  }

  /** Tear down workers and release resources. */
  async terminate(): Promise<void> {
    for (const terminable of this.terminables) {
      await terminable.terminate()
    }
    this.terminables.clear()
    this.initialized = false
    this.populationInitialized = false
    this.population = undefined
  }

  /** Access the population after init/evolve. */
  get currentPopulation(): Population<Ctx> | undefined {
    return this.population
  }

  /** Convert an organism to a sync executor for inference. */
  organismToExecutor(organism: Organism<Ctx>): StaticExecutor {
    return createExecutor(this.algorithm.createPhenotype(organism.genome))
  }

  /** Deserialize an organism from previously saved OrganismData.
   *  Uses the algorithm's createGenome to reconstruct the genome.
   *  Works independently of population state — does not require init(). */
  createOrganism(
    organismData: OrganismData<
      ConfigDataOf<Ctx>,
      StateDataOf<Ctx>,
      NodeHiddenDataOf<Ctx>,
      LinkDataOf<Ctx>,
      GenomeFactoryOptionsOf<Ctx>,
      GenomeOptionsOf<Ctx>
    >
  ): Organism<Ctx> {
    const configProvider = this.algorithm.createConfig(
      organismData.genome.config as ConfigFactoryOptionsOf<Ctx>
    )
    const stateProvider = this.algorithm.createState(organismData.genome.state)
    const initConfig: InitConfig = this.environment.description
    const genome = this.algorithm.createGenome(
      configProvider,
      stateProvider,
      organismData.genome.genomeOptions,
      initConfig,
      organismData.genome.factoryOptions
    )
    return new Organism<Ctx>(
      genome,
      organismData.organismState.generation,
      organismData.organismState
    )
  }

  /** Get the current population's serialized state for persistence.
   *  Returns PopulationData which can be saved to IndexedDB, file, etc.
   *  The `factoryOptions` field can be passed back as `population.factoryOptions`
   *  in a new EvolutionManagerOptions object to restore the population. */
  getPopulationData(): PopulationData<
    ConfigDataOf<Ctx>,
    StateDataOf<Ctx>,
    NodeHiddenDataOf<Ctx>,
    LinkDataOf<Ctx>,
    GenomeFactoryOptionsOf<Ctx>,
    GenomeOptionsOf<Ctx>
  > {
    const population = this.population
    if (population == null) {
      throw new Error('Population not initialized')
    }
    return population.toJSON()
  }

  /** Get the best organism's executor. Throws if no best found. */
  getBestExecutor(): StaticExecutor {
    const population = this.population
    if (population == null) {
      throw new Error('Population not initialized')
    }
    const best = population.best()
    if (best == null) {
      throw new Error('No best organism found')
    }
    return this.organismToExecutor(best)
  }

  private createWorkerFactories(effectiveStrategy?: EvaluationStrategy) {
    const evaluatorConfig = this.evaluatorConfig
    const algorithmPathname =
      evaluatorConfig?.algorithmPathname ?? this.algorithm.pathname
    const createExecutorPathname =
      evaluatorConfig?.createExecutorPathname ?? DEFAULT_EXECUTOR_PATHNAME
    const threadCount =
      evaluatorConfig?.threadCount ?? Math.max(1, hardwareConcurrency - 1)
    const taskCount =
      evaluatorConfig?.taskCount ?? this.populationOptions.populationSize

    const reproducerOptions: WorkerReproducerOptions = {
      algorithmPathname,
      threadCount,
      randomSeed: this.rng.derive('reproducer').toSeed(),
      enableCustomState: this.algorithm.enableCustomState,
    }
    if (evaluatorConfig?.reproducerWorkerScriptUrl != null) {
      reproducerOptions.workerScriptUrl =
        evaluatorConfig.reproducerWorkerScriptUrl
    }
    if (evaluatorConfig?.verbose != null) {
      reproducerOptions.verbose = evaluatorConfig.verbose
    }

    const reproducerFactory = createWorkerReproducerFactory(
      reproducerOptions,
      this.terminables
    )

    const evaluatorOptions: WorkerEvaluatorOptions = {
      algorithmPathname,
      createEnvironmentPathname: this.createEnvironmentPathname,
      createExecutorPathname,
      taskCount,
      threadCount,
    }
    if (effectiveStrategy != null) {
      evaluatorOptions.strategy = effectiveStrategy
    }
    if (evaluatorConfig?.evaluatorWorkerScriptUrl != null) {
      evaluatorOptions.workerScriptUrl =
        evaluatorConfig.evaluatorWorkerScriptUrl
    }
    if (evaluatorConfig?.verbose != null) {
      evaluatorOptions.verbose = evaluatorConfig.verbose
    }
    if (evaluatorConfig?.hydrateEnvironmentOptions != null) {
      evaluatorOptions.hydrateEnvironmentOptions =
        evaluatorConfig.hydrateEnvironmentOptions
    }
    if (this.stats != null) {
      evaluatorOptions.stats = this.stats
    }
    if (evaluatorConfig?.environmentRuntimeData != null) {
      evaluatorOptions.environmentRuntimeData =
        evaluatorConfig.environmentRuntimeData
    }

    const algorithm = this.algorithm as unknown as AnyErasedAlgorithm
    // WorkerEvaluator only uses toFactoryOptions() from the environment —
    // safe to cast EnvironmentConfig to Environment for the constructor
    const environment = this.environment as Environment
    const workerEvaluator: WorkerEvaluator = createWorkerEvaluator(
      algorithm,
      environment,
      evaluatorOptions
    )
    this.terminables.add(workerEvaluator)

    return {
      evaluator: workerEvaluator as Evaluator,
      createReproducer: reproducerFactory,
    }
  }
}
