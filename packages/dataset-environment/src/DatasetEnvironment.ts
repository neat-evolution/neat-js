import {
  type Environment,
  type EnvironmentDescription,
} from '@neat-js/environment'
import type { Executor } from '@neat-js/executor'

// import { binaryAccuracy, oneHotAccuracy } from './accuracy.js'
import { type Dataset } from './Dataset.js'
import { datasetToSharedBuffer } from './datasetToSharedBuffer.js'
import { crossentropy, mse } from './error.js'

// FIXME: implement this
export interface DatasetStats {
  validationFitness: number
  trainingAccuracy: number
  validationAccuracy: number
}

export class DatasetEnvironment implements Environment {
  public readonly dataset: Dataset
  public readonly description: EnvironmentDescription

  constructor(dataset: Dataset) {
    this.dataset = dataset
    this.description = {
      inputs: dataset.dimensions.inputs,
      outputs: dataset.dimensions.outputs,
    }
  }

  // private accuracy(targets: number[][], predictions: number[][]): number {
  //   if (!this.dataset.isClassification) {
  //     return 0.0
  //   } else if (this.dataset.oneHotOutput) {
  //     return oneHotAccuracy(targets, predictions)
  //   } else {
  //     return binaryAccuracy(targets, predictions)
  //   }
  // }

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
    const promises = this.dataset.trainingInputs.map(executor)
    const predictions = await Promise.all(promises)

    const fitness = this.fitness(this.dataset.trainingTargets, predictions)
    return fitness
  }

  // FIXME: rename to toSharedBuffer
  serialize(): SharedArrayBuffer {
    return datasetToSharedBuffer(this.dataset)
  }
}
