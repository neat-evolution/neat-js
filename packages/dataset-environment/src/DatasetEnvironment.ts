import {
  type EnvironmentDescription,
  type StandardEnvironment,
} from '@neat-evolution/environment'
import type { Executor, SyncExecutor } from '@neat-evolution/executor'

import { type Dataset } from './Dataset.js'
import { datasetToSharedBuffer } from './datasetToSharedBuffer.js'
import { crossentropy, mse } from './error.js'

export class DatasetEnvironment
  implements StandardEnvironment<SharedArrayBuffer> {
  public readonly dataset: Dataset
  public readonly description: EnvironmentDescription
  public readonly isAsync = false

  constructor(dataset: Dataset) {
    this.dataset = dataset
    this.description = {
      inputs: dataset.dimensions.inputs,
      outputs: dataset.dimensions.outputs,
    }
  }

  private fitness(targets: number[][], predictions: number[][]): number {
    const norm = this.dataset.isClassification && this.dataset.oneHotOutput

    if (norm) {
      return Math.exp(-crossentropy(targets, predictions, norm))
    } else {
      const e = 1.0 - mse(targets, predictions, norm)
      return isFinite(e) ? e : 0.0
    }
  }

  evaluate(executor: SyncExecutor): number {
    const predictions = executor.executeBatch(this.dataset.trainingInputs)

    const fitness = this.fitness(this.dataset.trainingTargets, predictions)
    return fitness
  }

  async evaluateAsync(executor: Executor): Promise<number> {
    const predictions = await executor.executeBatch(this.dataset.trainingInputs)

    const fitness = this.fitness(this.dataset.trainingTargets, predictions)
    return fitness
  }

  toFactoryOptions(): SharedArrayBuffer {
    return datasetToSharedBuffer(this.dataset)
  }
}
