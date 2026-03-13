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
import type {
  EvaluationPlugin,
  EvaluationStrategy,
} from '@neat-evolution/evaluation-strategy'
import { PluginStrategy } from '@neat-evolution/evaluation-strategy'
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
import type { SyncExecutor } from '@neat-evolution/executor'
import { createExecutor } from '@neat-evolution/executor'
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
  EvaluationConfig,
  EvolutionManagerConfig,
  WorkerConfig,
} from './EvolutionManagerConfig.js'

const DEFAULT_EXECUTOR_PATHNAME = '@neat-evolution/executor'

export class EvolutionManager<Ctx extends AlgorithmContext = AlgorithmContext> {
  private readonly algorithm: Algorithm<Ctx> & PopulationCreator<Ctx>
  private readonly environment: EnvironmentConfig
  private readonly evaluationConfig: EvaluationConfig
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
  private readonly workerConfig: WorkerConfig | undefined
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
    this.evaluationConfig = this.normalizeEvaluationConfig(config)
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
    this.workerConfig = config.workerConfig
    this.signal = config.signal
  }

  /** Create evaluator, reproducer, population. Idempotent. */
  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    let evaluator: Evaluator
    let createReproducer: (population: Population<Ctx>) => Reproducer

    // Resolve effective strategy: plugins wrap into PluginStrategy
    const effectiveStrategy = this.resolveStrategy()

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
      evaluator = createLocalEvaluator(algorithm, environment, {
        createExecutor,
        ...(effectiveStrategy != null ? { strategy: effectiveStrategy } : {}),
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
  organismToExecutor(organism: Organism<Ctx>): SyncExecutor {
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
  getBestExecutor(): SyncExecutor {
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

  /** Resolve the effective evaluation strategy.
   *  If plugins are provided, wraps them in a PluginStrategy.
   *  Otherwise returns the user-provided strategy (or undefined for default). */
  private resolveStrategy(): EvaluationStrategy | undefined {
    const evaluation = this.evaluationConfig

    if (evaluation.type === 'plugin-augmentation') {
      return this.createPluginStrategy(evaluation.plugins)
    }
    if (evaluation.type === 'plugin-replacement') {
      return this.createPluginStrategy([evaluation.plugin])
    }

    return evaluation.strategy
  }

  private createPluginStrategy(
    plugins: ReadonlyArray<EvaluationPlugin>
  ): EvaluationStrategy {
    const environment = this.environment as Environment
    const supportsTraining =
      this.workerConfig?.pluginPaths != null &&
      this.workerConfig.pluginPaths.length > 0

    return new PluginStrategy(plugins, {
      algorithm: this.algorithm as unknown as AnyErasedAlgorithm,
      environment,
      supportsTraining,
    })
  }

  private normalizeEvaluationConfig(
    config: EvolutionManagerConfig<Ctx>
  ): EvaluationConfig {
    if (config.evaluation != null) {
      return this.validateEvaluationConfig(config.evaluation)
    }

    if (config.plugins != null && config.plugins.length > 0) {
      throw new Error(
        'EvolutionManagerConfig.plugins is deprecated. Provide `evaluation: { type: "plugin-augmentation", plugins }` instead.'
      )
    }

    if (config.strategy != null) {
      return {
        type: 'strategy',
        strategy: config.strategy,
      }
    }
    return { type: 'strategy' }
  }

  private validateEvaluationConfig(config: EvaluationConfig): EvaluationConfig {
    if (config.type === 'plugin-augmentation') {
      if (config.plugins.length === 0) {
        throw new Error(
          'plugin-augmentation evaluation requires at least one plugin'
        )
      }
      for (const plugin of config.plugins) {
        if (this.getPluginMode(plugin) === 'replacement') {
          throw new Error(
            'Replacement plugins cannot run inside a plugin-augmentation evaluation.'
          )
        }
      }
      return config
    }

    if (config.type === 'plugin-replacement') {
      if (this.getPluginMode(config.plugin) !== 'replacement') {
        throw new Error(
          'plugin-replacement evaluation requires a plugin that declares mode "replacement".'
        )
      }
      return config
    }

    return config
  }

  private getPluginMode(
    plugin: EvaluationPlugin
  ): 'augmentation' | 'replacement' {
    const pluginWithMode = plugin as {
      mode?: 'augmentation' | 'replacement'
    }
    return pluginWithMode.mode ?? 'augmentation'
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
    if (workerConfig.pluginPaths != null) {
      evaluatorOptions.pluginPaths = workerConfig.pluginPaths
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
