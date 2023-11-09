import {
  type Environment,
  type EnvironmentDescription,
} from '@neat-evolution/environment'
import type { Executor } from '@neat-evolution/executor'

import { type Dataset } from './Dataset.js'
import { datasetToSharedBuffer } from './datasetToSharedBuffer.js'
import { crossentropy, mse } from './error.js'

export class DatasetEnvironment implements Environment {
  public readonly dataset: Dataset
  public readonly description: EnvironmentDescription
  public readonly batchSize: number

  constructor(dataset: Dataset) {
    this.dataset = dataset
    this.description = {
      inputs: dataset.dimensions.inputs,
      outputs: dataset.dimensions.outputs,
    }
    this.batchSize = this.dataset.trainingInputs.length
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

  async evaluate(executor: Executor): Promise<number> {
    // do it all in one batch
    const predictions = await executor(this.dataset.trainingInputs)

    const fitness = this.fitness(this.dataset.trainingTargets, predictions)
    return fitness
  }

  // FIXME: rename to toSharedBuffer
  serialize(): SharedArrayBuffer {
    return datasetToSharedBuffer(this.dataset)
  }
}
