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
} from '@neat-evolution/evaluation-strategy'
import type {
  AnyAlgorithm,
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

export class WorkerEvaluator<EFO> implements Evaluator<EFO> {
  public readonly algorithm: AnyAlgorithm<any>
  public readonly algorithmPathname: string
  public readonly enableAsync = true

  public readonly environment: Environment<EFO>

  public readonly taskCount: number
  public readonly threadCount: number
  public readonly createEnvironmentPathname: string
  public readonly createExecutorPathname: string
  public readonly initPromise: Promise<void>

  private readonly pool: WorkerPool
  private readonly dispatcher: Dispatcher

  /**
   * Evaluation context exposing worker pool functionality to evaluation strategies
   */
  public readonly evaluationContext: EvaluationContext<any>

  /**
   * Evaluation strategy determining how genomes are evaluated
   * Defaults to IndividualStrategy for backward compatibility
   */
  private readonly strategy: EvaluationStrategy<any>

  constructor(
    algorithm: AnyAlgorithm<any>,
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

    this.pool = new WorkerPool({
      threadCount: options.threadCount,
      taskCount: options.taskCount,
      workerScriptUrl: new URL('./workerEvaluatorScript.js', import.meta.url),
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
      dispatch: (action) => {
        void this.dispatcher.dispatch(action)
      },
      request: this.dispatcher.request.bind(this.dispatcher),
      broadcast: this.dispatcher.broadcast.bind(this.dispatcher),
      addActionHandler: this.dispatcher.addActionHandler.bind(this.dispatcher),
      removeActionHandler: this.dispatcher.removeActionHandler.bind(
        this.dispatcher
      ),
    }

    // Initialize strategy with default if not provided
    this.strategy = options.strategy ?? new IndividualStrategy()
  }

  async initWorkers() {
    // Wait for workers to be ready before sending init messages
    await this.pool.ready()

    const data = {
      algorithmPathname: this.algorithmPathname,
      createExecutorPathname: this.createExecutorPathname,
      createEnvironmentPathname: this.createEnvironmentPathname,
      environmentData: this.environment.toFactoryOptions(),
    }
    await this.dispatcher.broadcast<null>(initEvaluator(data))
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
    await this.dispatcher.broadcast(terminateAction())
    await this.pool.terminate()
  }

  async *evaluate(
    genomeEntries: GenomeEntries<any>
  ): AsyncIterable<FitnessData> {
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
    genomeEntry: GenomeEntry<any>,
    seed?: string
  ): Promise<FitnessData> {
    await this.initPromise
    const [speciesIndex, organismIndex, genome] = genomeEntry
    const fitness = await this.dispatcher.request<number>(
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
    genomeEntries: Array<GenomeEntry<any>>,
    seed?: string
  ): Promise<FitnessData[]> {
    await this.initPromise
    const genomeFactoryOptions = genomeEntries.map(([, , genome]) =>
      genome.toFactoryOptions()
    )
    const fitnessScores = await this.dispatcher.request<number[]>(
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
