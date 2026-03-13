import type {
  ConfigData,
  GenomeOptions,
  InitConfig,
} from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'
import {
  type EvaluationContext,
  type EvaluationStrategy,
  IndividualStrategy,
  type RLWorkerMethod,
  type WorkerRLCapabilities,
  type WorkerTrainingCapabilities,
} from '@neat-evolution/evaluation-strategy'
import type {
  AnyErasedAlgorithm,
  Evaluator,
  FitnessData,
  GenomeEntries,
  GenomeEntry,
} from '@neat-evolution/evaluator'
import { Dispatcher } from '@neat-evolution/worker-actions'
import { WorkerPool } from '@neat-evolution/worker-pool'

import {
  initEvaluator,
  initGenomeFactory as initGenomeFactoryAction,
  requestEvaluateBatch,
  requestEvaluateGenome,
  terminate as terminateAction,
} from './actions.js'
import type { WorkerEvaluatorOptions } from './WorkerEvaluatorOptions.js'

export class WorkerEvaluator<EFO = unknown> implements Evaluator<EFO> {
  public readonly algorithm: AnyErasedAlgorithm
  public readonly algorithmPathname: string
  public readonly enableAsync = true

  public readonly environment: Environment<EFO>

  public readonly taskCount: number
  public readonly threadCount: number
  public readonly createEnvironmentPathname: string
  public readonly createExecutorPathname: string
  public readonly executorCacheMaxSize: number
  public readonly pluginPaths: string[] | undefined
  public readonly initPromise: Promise<void>

  private readonly pool: WorkerPool
  private readonly dispatcher: Dispatcher
  private workerTrainingCapabilities: WorkerTrainingCapabilities | undefined

  /**
   * Evaluation context exposing worker pool functionality to evaluation strategies
   */
  public readonly evaluationContext: EvaluationContext

  /**
   * Evaluation strategy determining how genomes are evaluated
   * Defaults to IndividualStrategy for backward compatibility
   */
  private readonly strategy: EvaluationStrategy

  constructor(
    algorithm: AnyErasedAlgorithm,
    environment: Environment<EFO>,
    options: WorkerEvaluatorOptions
  ) {
    this.algorithm = algorithm
    this.algorithmPathname = options.algorithmPathname ?? algorithm.pathname
    this.environment = environment

    this.taskCount = options.taskCount
    this.threadCount = options.threadCount
    this.createExecutorPathname = options.createExecutorPathname
    this.createEnvironmentPathname = options.createEnvironmentPathname
    this.executorCacheMaxSize = options.executorCacheMaxSize ?? 0
    this.pluginPaths = options.pluginPaths

    // Use provided workerScriptUrl or fall back to default (works in Node.js, not Vite)
    const workerScriptUrl =
      options.workerScriptUrl ??
      new URL('./workerEvaluatorScript.js', import.meta.url)

    this.pool = new WorkerPool({
      threadCount: options.threadCount,
      taskCount: options.taskCount,
      workerScriptUrl,
      workerOptions: {
        name: 'WorkerEvaluator',
        type: 'module',
      },
      verbose: options.verbose ?? false,
    })

    this.dispatcher = new Dispatcher(this.pool, {
      verbose: options.verbose ?? false,
    })

    this.initPromise = this.initWorkers()

    // Create evaluation context - expose Dispatcher methods directly
    this.evaluationContext = {
      evaluateGenomeEntry: this.evaluateGenomeEntry.bind(this),
      evaluateGenomeEntryBatch: this.evaluateGenomeEntryBatch.bind(this),
      supportsTraining: (options.pluginPaths?.length ?? 0) > 0,
      send: (message) => {
        void this.dispatcher.send(message)
      },
      call: this.dispatcher.call.bind(this.dispatcher),
      broadcast: this.dispatcher.broadcast.bind(this.dispatcher),
      addMessageHandler: this.dispatcher.addMessageHandler.bind(
        this.dispatcher
      ),
      removeMessageHandler: this.dispatcher.removeMessageHandler.bind(
        this.dispatcher
      ),

      // Deprecated aliases
      dispatch: (message) => {
        void this.dispatcher.send(message)
      },
      request: this.dispatcher.call.bind(this.dispatcher),
      addActionHandler: this.dispatcher.addMessageHandler.bind(this.dispatcher),
      removeActionHandler: this.dispatcher.removeMessageHandler.bind(
        this.dispatcher
      ),
    }

    // Initialize strategy with default if not provided
    this.strategy = options.strategy ?? new IndividualStrategy()
  }

  async initWorkers() {
    // Wait for workers to be ready before sending init messages
    await this.pool.ready()

    const data: import('./actions.js').InitPayload = {
      algorithmPathname: this.algorithmPathname,
      createExecutorPathname: this.createExecutorPathname,
      createEnvironmentPathname: this.createEnvironmentPathname,
      environmentData: this.environment.toFactoryOptions(),
      executorCacheMaxSize: this.executorCacheMaxSize,
      ...(this.pluginPaths ? { pluginPaths: this.pluginPaths } : {}),
    }
    const workerCapabilities = await this.dispatcher.broadcast<
      WorkerTrainingCapabilities | undefined
    >(initEvaluator(data))
    this.workerTrainingCapabilities = aggregateWorkerCapabilities(
      workerCapabilities,
      this.threadCount
    )
    if (this.workerTrainingCapabilities !== undefined) {
      this.evaluationContext.workerTrainingCapabilities =
        this.workerTrainingCapabilities
    } else {
      delete this.evaluationContext.workerTrainingCapabilities
    }
  }

  async initGenomeFactory<CD extends ConfigData>(
    configData: CD,
    genomeOptions: GenomeOptions,
    initConfig: InitConfig
  ) {
    await this.initPromise
    await this.dispatcher.broadcast(
      initGenomeFactoryAction({
        configData,
        genomeOptions,
        initConfig,
      })
    )
  }

  async terminate() {
    await this.initPromise
    await this.dispatcher.broadcast(terminateAction(null))
    await this.pool.terminate()
  }

  async *evaluate(genomeEntries: GenomeEntries): AsyncIterable<FitnessData> {
    await this.initPromise
    // Delegate to strategy, passing the evaluation context
    yield* this.strategy.evaluate(this.evaluationContext, genomeEntries)
  }

  /**
   * Evaluates a single genome entry using a worker
   * @param {GenomeEntry<any>} genomeEntry - The genome entry to evaluate
   * @param seed
   * @returns {Promise<FitnessData>} Fitness data for the genome
   */
  private async evaluateGenomeEntry(
    genomeEntry: GenomeEntry,
    seed?: string
  ): Promise<FitnessData> {
    await this.initPromise
    const [speciesIndex, organismIndex, genome] = genomeEntry
    const fitness = await this.dispatcher.call<number>(
      requestEvaluateGenome({
        genomeOptions: genome.toFactoryOptions(),
        seed,
      })
    )
    return [speciesIndex, organismIndex, fitness]
  }

  /**
   * Evaluates a batch of genome entries together using a single worker
   * This is critical for tournament-style evaluation where genomes compete
   * @param {Array<GenomeEntry<any>>} genomeEntries - Array of genome entries to evaluate together
   * @param seed
   * @returns {Promise<FitnessData[]>} Array of fitness data for each genome
   */
  private async evaluateGenomeEntryBatch(
    genomeEntries: Array<GenomeEntry>,
    seed?: string
  ): Promise<FitnessData[]> {
    await this.initPromise
    const genomeFactoryOptions = genomeEntries.map(([, , genome]) =>
      genome.toFactoryOptions()
    )
    const fitnessScores = await this.dispatcher.call<number[]>(
      requestEvaluateBatch({
        genomeOptions: genomeFactoryOptions,
        seed,
      })
    )

    return genomeEntries.map(([speciesIndex, organismIndex], index) => {
      const fitness = fitnessScores[index]
      if (fitness === undefined) {
        throw new Error(`Missing fitness score at index ${index}`)
      }
      return [speciesIndex, organismIndex, fitness]
    })
  }
}

const RL_METHODS: RLWorkerMethod[] = ['actor-critic', 'q-learning']

const aggregateWorkerCapabilities = (
  snapshots: Array<WorkerTrainingCapabilities | undefined>,
  workerCount: number
): WorkerTrainingCapabilities | undefined => {
  if (workerCount === 0) {
    return undefined
  }

  const rlSnapshots = snapshots
    .map((cap) => cap?.rl)
    .filter((rl): rl is WorkerRLCapabilities => rl != null)
  if (rlSnapshots.length === 0) {
    return {
      rl: {
        supported: false,
        reason: 'Worker RL plugin not registered on workers',
        methods: {},
      },
    }
  }

  const rlSupportedEverywhere =
    rlSnapshots.length === workerCount &&
    rlSnapshots.every((snapshot) => snapshot.supported)

  const rlCapabilities: WorkerRLCapabilities = {
    supported: rlSupportedEverywhere,
    ...(rlSupportedEverywhere
      ? {}
      : {
          reason:
            rlSnapshots.length < workerCount
              ? 'Worker RL plugin missing on some workers'
              : 'Worker RL plugin reported RL disabled',
        }),
    methods: {},
  }

  for (const method of RL_METHODS) {
    const methodSnapshots = snapshots.map((cap) => cap?.rl?.methods?.[method])
    const definedCount = methodSnapshots.filter((entry) => entry != null).length
    if (definedCount === 0) {
      continue
    }

    const supportedEverywhere =
      rlSupportedEverywhere &&
      methodSnapshots.every((entry) => entry?.supported === true)
    const supportsLamarckian =
      supportedEverywhere &&
      methodSnapshots.every(
        (entry) => entry?.supportsLamarckianWriteback !== false
      )

    rlCapabilities.methods[method] = {
      supported: supportedEverywhere,
      supportsLamarckianWriteback: supportsLamarckian,
      ...(supportedEverywhere
        ? {}
        : {
            reason:
              definedCount < workerCount
                ? 'Method missing on some workers'
                : 'Method disabled by worker plugin',
          }),
    }
  }

  return { rl: rlCapabilities }
}
