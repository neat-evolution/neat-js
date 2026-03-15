import type {
  AnyGenome,
  FitnessData,
  PhenotypeAction,
} from '@neat-evolution/core'
import {
  type Environment,
  isRuntimeConfigurable,
} from '@neat-evolution/environment'
import type { EvaluationContext } from '@neat-evolution/evaluation-strategy'
import type { ExecutorFactory } from '@neat-evolution/executor'
import type { StatsRecorder } from '@neat-evolution/stats'

import type { Evaluator } from './Evaluator.js'
import type { EvaluatorFactoryOptions } from './EvaluatorFactoryOptions.js'
import type { GenomeEntries, GenomeEntry } from './GenomeEntries.js'
import { LocalDispatcher } from './LocalDispatcher.js'
import type { AnyAlgorithm } from './types.js'

export class LocalEvaluator<EFO> implements Evaluator<EFO> {
  public readonly algorithm: AnyAlgorithm
  public readonly enableAsync = true

  public readonly environment: Environment<EFO>

  public readonly createExecutor: ExecutorFactory

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
    this.algorithm = algorithm
    this.environment = environment
    this.createExecutor = options.createExecutor
    this.strategy = options.strategy
    if (options.stats != null) {
      this.stats = options.stats
    }
    this.localDispatcher = new LocalDispatcher()
  }

  private async worker(entry: GenomeEntry): Promise<FitnessData> {
    const [speciesIndex, organismIndex, genome] = entry
    const phenotype = this.algorithm.createPhenotype(genome)
    const executor = this.createExecutor(phenotype)

    let fitness: number

    if (this.environment.isAsync) {
      fitness = await this.environment.evaluateAsync(executor)
    } else {
      fitness = this.environment.evaluate(executor)
    }
    return [speciesIndex, organismIndex, fitness]
  }

  async initGenomeFactory(): Promise<void> {
    // no-op
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
        recordWriteback: (genome, updatedActions) => {
          this.pendingWritebacks.set(genome, updatedActions)
        },
        recordTelemetry: (genome, telemetry) => {
          this.telemetryByGenome.set(genome, telemetry)
        },
        getTelemetry: (genome) => {
          return this.telemetryByGenome.get(genome)
        },
        ...(this.stats != null ? { stats: this.stats } : {}),
      }
      if (isRuntimeConfigurable(this.environment)) {
        this.environment.setRuntimeOptions({
          ...(this.stats != null ? { stats: this.stats } : {}),
        })
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
