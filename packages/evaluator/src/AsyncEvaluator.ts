import type { Algorithm } from '@neat-js/core'
import type { Environment } from '@neat-js/environment'
import type { ExecutorFactory } from '@neat-js/executor'

import { type Evaluator, type FitnessData } from './Evaluator.js'
import type { GenomeEntries, GenomeEntry } from './GenomeEntries.js'

export class AsyncEvaluator implements Evaluator {
  public readonly algorithm: Algorithm<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >

  public readonly environment: Environment
  public readonly createExecutor: ExecutorFactory

  constructor(
    algorithm: Algorithm<
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >,
    environment: Environment,
    createExecutor: ExecutorFactory
  ) {
    this.algorithm = algorithm
    this.environment = environment
    this.createExecutor = createExecutor
  }

  private async worker(entry: GenomeEntry<any>): Promise<FitnessData> {
    const [speciesIndex, organismIndex, genome] = entry
    const phenotype = this.algorithm.createPhenotype(genome)
    const executor = this.createExecutor(phenotype, this.environment.batchSize)
    const fitness = await this.environment.evaluate(executor)
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
