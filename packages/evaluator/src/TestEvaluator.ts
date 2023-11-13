import type { StandardEnvironment } from '@neat-evolution/environment'
import { isAsyncExecutor, type ExecutorFactory } from '@neat-evolution/executor'

import { type FitnessData, type StandardEvaluator } from './Evaluator.js'
import type { GenomeEntries, GenomeEntry } from './GenomeEntries.js'
import type { AnyAlgorithm } from './types.js'

// FIXME: write tests for correctness
export class TestEvaluator implements StandardEvaluator {
  public readonly algorithm: AnyAlgorithm
  public readonly enableAsync = true

  public readonly environment: StandardEnvironment<any>

  public readonly createExecutor: ExecutorFactory

  constructor(
    algorithm: AnyAlgorithm,
    environment: StandardEnvironment<any>,
    createExecutor: ExecutorFactory
  ) {
    this.algorithm = algorithm
    this.environment = environment
    this.createExecutor = createExecutor
  }

  private async worker(entry: GenomeEntry<any>): Promise<FitnessData> {
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

  async *evaluate(
    genomeEntries: GenomeEntries<any>
  ): AsyncIterable<FitnessData> {
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
