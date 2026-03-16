import type {
  AnyGenome,
  FitnessData,
  PhenotypeAction,
} from '@neat-evolution/core'
import {
  type Environment,
  type EnvironmentRuntimeOptions,
  isRuntimeConfigurable,
} from '@neat-evolution/environment'
import type { EvaluationContext } from '@neat-evolution/evaluation-strategy'
import type { ExecutorFactory } from '@neat-evolution/executor'
import type { StatsRecorder } from '@neat-evolution/stats'
import { createBoundContext } from './createBoundContext.js'
import type { Evaluator } from './Evaluator.js'
import type { EvaluatorFactoryOptions } from './EvaluatorFactoryOptions.js'
import type { GenomeEntries, GenomeEntry } from './GenomeEntries.js'
import { LocalDispatcher } from './LocalDispatcher.js'
import type { RuntimeConfig } from './RuntimeConfig.js'
import type { AnyAlgorithm } from './types.js'

const DEFAULT_EXECUTOR_PATHNAME = '@neat-evolution/executor'

/**
 * In-process evaluator for isolated unit tests only.
 *
 * Production code must use WorkerEvaluator via EvolutionManager.
 * This evaluator runs everything on the main thread and does not
 * exercise the worker hydration path — any behavior validated here
 * may diverge from production.
 *
 * @deprecated Use WorkerEvaluator via EvolutionManager instead.
 */
export class UnsafeTestEvaluator<EFO> implements Evaluator<EFO> {
  public readonly algorithm: AnyAlgorithm
  public readonly enableAsync = true

  public readonly environment: Environment<EFO>

  private executorFactory: ExecutorFactory | undefined
  private baseRuntimeOptions: EnvironmentRuntimeOptions | undefined

  private readonly runtimeConfig: RuntimeConfig | undefined
  private readonly strategy?: EvaluatorFactoryOptions['strategy']
  private readonly stats?: StatsRecorder
  private readonly localDispatcher: LocalDispatcher

  /** Pending Lamarckian writebacks collected from plugin results. */
  private readonly pendingWritebacks = new Map<AnyGenome, PhenotypeAction[]>()
  /** Latest telemetry per genome from plugin results. */
  private readonly telemetryByGenome = new WeakMap<AnyGenome, unknown>()

  constructor(
    algorithm: AnyAlgorithm,
    environment: Environment<EFO>,
    options: EvaluatorFactoryOptions
  ) {
    if (options.unsafeLocalEvaluation !== true) {
      throw new Error(
        'UnsafeTestEvaluator is for isolated unit tests only. ' +
          'Use WorkerEvaluator via EvolutionManager for all other cases. ' +
          'To opt in, pass { unsafeLocalEvaluation: true } in options.'
      )
    }

    this.algorithm = algorithm
    this.environment = environment
    this.runtimeConfig = options.runtimeConfig
    this.strategy = options.strategy
    if (options.stats != null) {
      this.stats = options.stats
    }
    this.localDispatcher = new LocalDispatcher()
  }

  private async worker(entry: GenomeEntry): Promise<FitnessData> {
    const [speciesIndex, organismIndex, genome] = entry

    if (this.executorFactory == null) {
      throw new Error(
        'TestEvaluator not initialized — call initGenomeFactory() first'
      )
    }

    const phenotype = this.algorithm.createPhenotype(genome)
    const executor = this.executorFactory(phenotype)

    // Create bound context (same lifecycle as handleEvaluateGenome)
    const boundContext = createBoundContext({
      send: this.localDispatcher.context.send,
      call: this.localDispatcher.context.call,
      stats: this.stats,
    })
    boundContext.executorMap.set(executor, 0)

    // Push runtime options to environment per-genome
    if (isRuntimeConfigurable(this.environment)) {
      this.environment.setRuntimeOptions({
        ...this.baseRuntimeOptions,
        evaluationContext: boundContext,
      })
    }

    let fitness: number

    if (this.environment.isAsync) {
      fitness = await this.environment.evaluateAsync(executor)
    } else {
      fitness = this.environment.evaluate(executor)
    }

    // Flush writebacks and fire onFitness callbacks
    const writebackResults = boundContext.flush()
    boundContext.fireFitnessCallbacks(fitness)

    if (writebackResults != null) {
      const updatedActions = writebackResults.get(0)
      if (updatedActions != null) {
        this.pendingWritebacks.set(genome, updatedActions)
      }
    }

    return [speciesIndex, organismIndex, fitness]
  }

  async initGenomeFactory(): Promise<void> {
    // Dynamic import executor factory (mirrors handleInitEvaluator)
    const pathname =
      this.runtimeConfig?.createExecutorPathname ?? DEFAULT_EXECUTOR_PATHNAME
    const mod = await import(/* @vite-ignore */ pathname)
    this.executorFactory = mod.createExecutor

    // Build baseRuntimeOptions (same flow as handleInitEvaluator)
    const runtimeOptions: EnvironmentRuntimeOptions = {}
    if (this.stats != null) {
      runtimeOptions.stats = this.stats
    }
    if (this.runtimeConfig?.environmentRuntimeData != null) {
      Object.assign(runtimeOptions, this.runtimeConfig.environmentRuntimeData)
    }
    if (this.runtimeConfig?.hydrateEnvironmentOptions != null) {
      for (const [field, path] of Object.entries(
        this.runtimeConfig.hydrateEnvironmentOptions
      )) {
        const mod = await import(/* @vite-ignore */ path)
        runtimeOptions[field] = mod.default ?? mod[field]
      }
    }
    this.baseRuntimeOptions = runtimeOptions
  }

  /** Retrieve the latest telemetry for a genome (from plugin evaluation). */
  getTelemetry(genome: AnyGenome): unknown {
    return this.telemetryByGenome.get(genome)
  }

  async *evaluate(genomeEntries: GenomeEntries): AsyncIterable<FitnessData> {
    if (this.strategy) {
      // Clear pending writebacks from previous generation
      this.pendingWritebacks.clear()
      const context: EvaluationContext = {
        evaluateGenomeEntry: (entry) => this.worker(entry),
        evaluateGenomeEntryBatch: (entries) =>
          Promise.all(entries.map((e) => this.worker(e))),
        ...this.localDispatcher.context,
        ...(this.stats != null ? { stats: this.stats } : {}),
      }
      yield* this.strategy.evaluate(context, genomeEntries)
      // After all fitness has been yielded, apply Lamarckian writebacks
      this.applyWritebacks()
      return
    }

    // Existing behavior (no strategy)
    const promises: Array<Promise<FitnessData>> = []
    for (const data of genomeEntries) {
      promises.push(this.worker(data))
    }

    while (promises.length > 0) {
      const p = promises.shift()
      if (p != null) {
        yield await p
      }
    }
  }

  /** Apply all pending Lamarckian writebacks to genomes. */
  private applyWritebacks(): void {
    for (const [genome, updatedActions] of this.pendingWritebacks) {
      this.algorithm.writeBackWeights(genome, updatedActions)
    }
    this.pendingWritebacks.clear()
  }
}
