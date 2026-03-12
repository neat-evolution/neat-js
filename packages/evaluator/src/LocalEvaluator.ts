import type { FitnessData } from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'
import type { EvaluationContext } from '@neat-evolution/evaluation-strategy'
import { type ExecutorFactory, isAsyncExecutor } from '@neat-evolution/executor'

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
  private readonly localDispatcher: LocalDispatcher

  constructor(
    algorithm: AnyAlgorithm,
    environment: Environment<EFO>,
    options: EvaluatorFactoryOptions
  ) {
    this.algorithm = algorithm
    this.environment = environment
    this.createExecutor = options.createExecutor
    this.strategy = options.strategy
    this.localDispatcher = new LocalDispatcher()
  }

  private async worker(entry: GenomeEntry): Promise<FitnessData> {
    const [speciesIndex, organismIndex, genome] = entry
    const phenotype = this.algorithm.createPhenotype(genome)
    const executor = this.createExecutor(phenotype)

    let fitness: number

    if (isAsyncExecutor(executor)) {
      fitness = await this.environment.evaluateAsync(executor)
    } else {
      fitness = this.environment.evaluate(executor)
    }
    return [speciesIndex, organismIndex, fitness]
  }

  async initGenomeFactory(): Promise<void> {
    // no-op
  }

  async *evaluate(genomeEntries: GenomeEntries): AsyncIterable<FitnessData> {
    if (this.strategy) {
      const context: EvaluationContext = {
        evaluateGenomeEntry: (entry) => this.worker(entry),
        evaluateGenomeEntryBatch: (entries) =>
          Promise.all(entries.map((e) => this.worker(e))),
        ...this.localDispatcher.context,
      }
      yield* this.strategy.evaluate(context, genomeEntries)
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
}
