import type {
  AnyGenome,
  ConfigData,
  GenomeOptions,
  InitConfig,
  PhenotypeAction,
} from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'
import {
  type EvaluationContext,
  type EvaluationStrategy,
  IndividualStrategy,
} from '@neat-evolution/evaluation-strategy'
import type {
  AnyErasedAlgorithm,
  Evaluator,
  FitnessData,
  GenomeEntries,
  GenomeEntry,
} from '@neat-evolution/evaluator'
import type { StatsRecorder } from '@neat-evolution/stats'
import { Dispatcher } from '@neat-evolution/worker-actions'
import { WorkerPool } from '@neat-evolution/worker-pool'

import {
  type EvaluateBatchResult,
  type EvaluateGenomeResult,
  initEvaluator,
  initGenomeFactory as initGenomeFactoryAction,
  type RecordStatsPayload,
  recordStats,
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
  public readonly hydrateEnvironmentOptions: Record<string, string> | undefined
  public readonly environmentRuntimeData: Record<string, unknown> | undefined
  public readonly initPromise: Promise<void>

  private readonly pool: WorkerPool
  private readonly dispatcher: Dispatcher

  /** Pending Lamarckian writebacks collected from worker responses. */
  private readonly pendingWritebacks = new Map<AnyGenome, PhenotypeAction[]>()
  /** Latest telemetry per genome from worker responses. */
  private readonly telemetryByGenome = new WeakMap<AnyGenome, unknown>()
  private readonly stats: StatsRecorder | undefined

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
    this.hydrateEnvironmentOptions = options.hydrateEnvironmentOptions
    this.environmentRuntimeData = options.environmentRuntimeData
    this.stats = options.stats

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
    })

    this.dispatcher = new Dispatcher(this.pool)

    this.initPromise = this.initWorkers()

    // Create evaluation context - expose Dispatcher methods directly
    this.evaluationContext = {
      evaluateGenomeEntry: this.evaluateGenomeEntry.bind(this),
      evaluateGenomeEntryBatch: this.evaluateGenomeEntryBatch.bind(this),
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
      ...(this.stats != null ? { stats: this.stats } : {}),
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
      ...(this.hydrateEnvironmentOptions
        ? { hydrateEnvironmentOptions: this.hydrateEnvironmentOptions }
        : {}),
      ...(this.environmentRuntimeData
        ? { environmentRuntimeData: this.environmentRuntimeData }
        : {}),
    }

    // Serialize stats config and register handler for worker stats messages
    if (this.stats != null) {
      const statsConfig = this.stats.toJSON()
      if (statsConfig.wantedMetrics.length > 0) {
        data.statsConfig = statsConfig
        const stats = this.stats
        this.dispatcher.addMessageHandler(recordStats, (message) => {
          const payload = message.payload as RecordStatsPayload
          stats.record(payload.metric, payload.value)
        })
      }
    }

    await this.dispatcher.broadcast(initEvaluator(data))
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
    // Clear pending writebacks from previous generation
    this.pendingWritebacks.clear()
    // Delegate to strategy, passing the evaluation context
    yield* this.strategy.evaluate(this.evaluationContext, genomeEntries)
    // After all fitness has been yielded, apply Lamarckian writebacks
    this.applyWritebacks()
  }

  /** Retrieve the latest telemetry for a genome (from worker evaluation). */
  getTelemetry(genome: AnyGenome): unknown {
    return this.telemetryByGenome.get(genome)
  }

  /**
   * Evaluates a single genome entry using a worker.
   * Handles enriched responses: extracts writeback data and telemetry,
   * returns clean FitnessData to the strategy.
   */
  private async evaluateGenomeEntry(
    genomeEntry: GenomeEntry,
    seed?: string
  ): Promise<FitnessData> {
    await this.initPromise
    const [speciesIndex, organismIndex, genome] = genomeEntry
    const result = await this.dispatcher.call<EvaluateGenomeResult>(
      requestEvaluateGenome({
        genomeOptions: genome.toFactoryOptions(),
        seed,
      })
    )

    // Extract side effects from the enriched response
    if (result.updatedActions != null) {
      this.pendingWritebacks.set(genome, result.updatedActions)
    }
    if (result.telemetry != null) {
      this.telemetryByGenome.set(genome, result.telemetry)
    }

    // Return clean FitnessData — strategies never see writeback or telemetry
    return [speciesIndex, organismIndex, result.fitness]
  }

  /**
   * Evaluates a batch of genome entries together using a single worker.
   * This is critical for tournament-style evaluation where genomes compete.
   * Batch evaluation does not support training enrichment (returns plain fitness).
   */
  private async evaluateGenomeEntryBatch(
    genomeEntries: Array<GenomeEntry>,
    seed?: string
  ): Promise<FitnessData[]> {
    await this.initPromise
    const genomeFactoryOptions = genomeEntries.map(([, , genome]) =>
      genome.toFactoryOptions()
    )
    const batchResult = await this.dispatcher.call<EvaluateBatchResult>(
      requestEvaluateBatch({
        genomeOptions: genomeFactoryOptions,
        seed,
      })
    )
    const { fitnessScores } = batchResult

    return genomeEntries.map(([speciesIndex, organismIndex], index) => {
      const fitness = fitnessScores[index]
      if (fitness === undefined) {
        throw new Error(`Missing fitness score at index ${index}`)
      }
      return [speciesIndex, organismIndex, fitness]
    })
  }

  /** Apply all pending Lamarckian writebacks to genomes. */
  private applyWritebacks(): void {
    for (const [genome, updatedActions] of this.pendingWritebacks) {
      this.algorithm.writeBackWeights(genome, updatedActions)
    }
    this.pendingWritebacks.clear()
  }
}
