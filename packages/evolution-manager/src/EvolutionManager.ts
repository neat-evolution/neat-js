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
  EnvironmentRuntimeOptions,
} from '@neat-evolution/environment'
import type { EvaluationStrategy } from '@neat-evolution/evaluation-strategy'
import type { Evaluator } from '@neat-evolution/evaluator'
import { createEvaluator as createLocalEvaluator } from '@neat-evolution/evaluator'
import type {
  EvolutionOptions,
  PopulationCreator,
  PopulationOptions,
  Reproducer,
  ReproducerFactory,
} from '@neat-evolution/evolution'
import {
  createReproducer as createLocalReproducer,
  defaultEvolutionOptions,
  defaultPopulationOptions,
  evolve,
  Organism,
  type OrganismData,
  type Population,
  type PopulationData,
  type PopulationFactoryOptions,
} from '@neat-evolution/evolution'
import type { ExecutorFactory, StaticExecutor } from '@neat-evolution/executor'
import {
  createExecutor,
  createTrainableExecutor,
} from '@neat-evolution/executor'
import type { StatsRecorder } from '@neat-evolution/stats'
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
  EvolutionManagerConfig,
  WorkerConfig,
} from './EvolutionManagerConfig.js'

const DEFAULT_EXECUTOR_PATHNAME = '@neat-evolution/executor'

export class EvolutionManager<Ctx extends AlgorithmContext = AlgorithmContext> {
  private readonly algorithm: Algorithm<Ctx> & PopulationCreator<Ctx>
  private readonly environment: EnvironmentConfig
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
  private readonly environmentRuntimeOptions:
    | EnvironmentRuntimeOptions
    | undefined
  private readonly workerConfig: WorkerConfig | undefined
  private readonly stats: StatsRecorder | undefined
  private readonly signal: AbortSignal | undefined

  private readonly terminables = new Set<Terminable>()
  private population: Population<Ctx> | undefined
  private initialized = false
  private populationInitialized = false

  constructor(config: EvolutionManagerConfig<Ctx>) {
    if (config.algorithm == null) {
      throw new Error('EvolutionManager requires an algorithm')
    }
    if (config.environment == null) {
      throw new Error('EvolutionManager requires an environment')
    }

    this.algorithm = config.algorithm
    this.environment = config.environment
    this.strategy = config.strategy
    this.evolutionOptions = {
      ...defaultEvolutionOptions,
      ...config.evolutionOptions,
    }
    this.populationOptions = {
      ...defaultPopulationOptions,
      ...config.populationOptions,
    }
    this.configData = config.configData
    this.genomeOptions =
      config.genomeOptions ??
      ({ ...config.algorithm.defaultOptions } as GenomeOptionsOf<Ctx>)
    this.populationFactoryOptions = config.populationFactoryOptions
    this.environmentRuntimeOptions = config.environmentRuntimeOptions
    this.workerConfig = config.workerConfig
    this.stats = config.stats
    this.signal = config.signal
  }

  /** Create evaluator, reproducer, population. Idempotent. */
  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    let evaluator: Evaluator
    let createReproducer: (population: Population<Ctx>) => Reproducer

    const effectiveStrategy = this.strategy

    if (this.workerConfig != null) {
      const result = this.createWorkerFactories(
        this.workerConfig,
        effectiveStrategy
      )
      evaluator = result.evaluator
      createReproducer = result.createReproducer
    } else {
      const algorithm = this.algorithm as unknown as AnyErasedAlgorithm
      const environment = this.environment as Environment
      // When the environment needs a trainer or agent factory, use trainable executors
      const needsTrainable =
        this.environmentRuntimeOptions?.trainerFactory != null ||
        this.environmentRuntimeOptions?.agentFactory != null
      const executorFactory: ExecutorFactory = needsTrainable
        ? createTrainableExecutor
        : createExecutor
      evaluator = createLocalEvaluator(algorithm, environment, {
        createExecutor: executorFactory,
        ...(effectiveStrategy != null ? { strategy: effectiveStrategy } : {}),
        ...(this.stats != null ? { stats: this.stats } : {}),
        ...(this.environmentRuntimeOptions != null
          ? { environmentRuntimeOptions: this.environmentRuntimeOptions }
          : {}),
      })
      createReproducer = createLocalReproducer as unknown as ReproducerFactory<
        Population<Ctx>
      >
    }

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
      for (let i = 0; i < initialMutations; i++) {
        await population.mutate()
      }
    }
    await population.evaluate()

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
   *  The `factoryOptions` field can be passed back as `populationFactoryOptions`
   *  in a new EvolutionManagerConfig to restore the population. */
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

  private createWorkerFactories(
    workerConfig: WorkerConfig,
    effectiveStrategy?: EvaluationStrategy
  ) {
    const algorithmPathname =
      workerConfig.algorithmPathname ?? this.algorithm.pathname
    const createExecutorPathname =
      workerConfig.createExecutorPathname ?? DEFAULT_EXECUTOR_PATHNAME
    const threadCount =
      workerConfig.threadCount ?? Math.max(1, hardwareConcurrency - 1)
    const taskCount =
      workerConfig.taskCount ?? this.populationOptions.populationSize

    const reproducerOptions: WorkerReproducerOptions = {
      algorithmPathname,
      threadCount,
      enableCustomState: this.algorithm.enableCustomState,
    }
    if (workerConfig.reproducerWorkerScriptUrl != null) {
      reproducerOptions.workerScriptUrl = workerConfig.reproducerWorkerScriptUrl
    }
    if (workerConfig.verbose != null) {
      reproducerOptions.verbose = workerConfig.verbose
    }

    const reproducerFactory = createWorkerReproducerFactory(
      reproducerOptions,
      this.terminables
    )

    const evaluatorOptions: WorkerEvaluatorOptions = {
      algorithmPathname,
      createEnvironmentPathname: workerConfig.createEnvironmentPathname,
      createExecutorPathname,
      taskCount,
      threadCount,
    }
    if (effectiveStrategy != null) {
      evaluatorOptions.strategy = effectiveStrategy
    }
    if (workerConfig.evaluatorWorkerScriptUrl != null) {
      evaluatorOptions.workerScriptUrl = workerConfig.evaluatorWorkerScriptUrl
    }
    if (workerConfig.verbose != null) {
      evaluatorOptions.verbose = workerConfig.verbose
    }
    if (workerConfig.hydrateEnvironmentOptions != null) {
      evaluatorOptions.hydrateEnvironmentOptions =
        workerConfig.hydrateEnvironmentOptions
    }
    if (this.stats != null) {
      evaluatorOptions.stats = this.stats
    }
    if (workerConfig.environmentRuntimeData != null) {
      evaluatorOptions.environmentRuntimeData =
        workerConfig.environmentRuntimeData
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
