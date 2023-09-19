import type { Environment } from '@neat-js/environment'
import type { ExecutorFactory } from '@neat-js/executor'
import type { PhenotypeData } from '@neat-js/phenotype'

import { type Evaluator, type FitnessData } from './Evaluator.js'

export class AsyncEvaluator implements Evaluator {
  public readonly environment: Environment
  public readonly createExecutor: ExecutorFactory

  constructor(environment: Environment, createExecutor: ExecutorFactory) {
    this.environment = environment
    this.createExecutor = createExecutor
  }

  private async worker(data: PhenotypeData): Promise<FitnessData> {
    const [speciesIndex, organismIndex, phenotype] = data
    const executor = this.createExecutor(phenotype, this.environment.batchSize)
    const fitness = await this.environment.evaluate(executor)
    return [speciesIndex, organismIndex, fitness]
  }

  async *evaluate(
    phenotypeData: Iterable<PhenotypeData>
  ): AsyncIterable<FitnessData> {
    const promises: Array<Promise<FitnessData>> = []
    for (const data of phenotypeData) {
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
