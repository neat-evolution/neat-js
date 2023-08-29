import { type Environment } from '@neat-js/evolution'
import { type ExecutorFactory } from '@neat-js/executor'

import {
  type Evaluator,
  type FitnessData,
  type PhenotypeData,
} from './Evaluator.js'

export class AsyncEvaluator implements Evaluator {
  environment: Environment
  createExecutor: ExecutorFactory

  constructor(environment: Environment, createExecutor: ExecutorFactory) {
    this.environment = environment
    this.createExecutor = createExecutor
  }

  private async worker(data: PhenotypeData): Promise<FitnessData> {
    const [speciesIndex, organismIndex, phenotype] = data

    // FIXME: how to access this across worker thread boundary?
    const executor = this.createExecutor(phenotype)
    const fitness = await this.environment.evaluate(executor)
    return [speciesIndex, organismIndex, fitness]
  }

  async *evaluate(
    organismData: Iterable<PhenotypeData>
  ): AsyncIterable<FitnessData> {
    const promises = new Set<Promise<FitnessData>>()
    for (const data of organismData) {
      promises.add(this.worker(data))
    }

    for (const p of promises) {
      yield await p
    }
  }
}
