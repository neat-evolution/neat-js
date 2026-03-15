import type {
  Environment,
  EnvironmentDescription,
  LossConfig,
  SupervisedEnvironment,
  TrainingData,
} from '@neat-evolution/environment'
import type { StaticExecutor } from '@neat-evolution/executor'

import type { Dataset } from './Dataset.js'
import { datasetToSharedBuffer } from './datasetToSharedBuffer.js'
import { crossentropy, mse } from './error.js'
import type { Matrix } from './types.js'

export class DatasetEnvironment
  implements Environment<SharedArrayBuffer>, SupervisedEnvironment
{
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

  private fitness(targets: Matrix, predictions: Matrix): number {
    const norm = this.dataset.isClassification && this.dataset.oneHotOutput
    if (norm) {
      return Math.exp(-crossentropy(targets, predictions, norm))
    } else {
      const e = 1.0 - mse(targets, predictions, norm)
      return Number.isFinite(e) ? e : 0.0
    }
  }

  evaluate(executor: StaticExecutor): number {
    const predictions = executor.forwardBatch(this.dataset.trainingInputs)

    const fitness = this.fitness(this.dataset.trainingTargets, predictions)
    return fitness
  }

  async evaluateAsync(executor: StaticExecutor): Promise<number> {
    const predictions = executor.forwardBatch(this.dataset.trainingInputs)

    const fitness = this.fitness(this.dataset.trainingTargets, predictions)
    return fitness
  }

  evaluateBatch(executors: StaticExecutor[]): number[] {
    return executors.map((executor) => this.evaluate(executor))
  }

  async evaluateBatchAsync(executors: StaticExecutor[]): Promise<number[]> {
    const promises = executors.map(
      async (executor) => await this.evaluateAsync(executor)
    )
    return await Promise.all(promises)
  }

  getTrainingData(): TrainingData {
    return {
      inputs: this.dataset.trainingInputs,
      targets: this.dataset.trainingTargets,
      count: this.dataset.trainingCount,
    }
  }

  getValidationData(): TrainingData {
    return {
      inputs: this.dataset.validationInputs,
      targets: this.dataset.validationTargets,
      count: this.dataset.validationCount,
    }
  }

  getLossConfig(): LossConfig {
    return {
      isClassification: this.dataset.isClassification,
      oneHotOutput: this.dataset.oneHotOutput,
    }
  }

  computeFitness(
    targets: ReadonlyArray<number[] | Float64Array>,
    predictions: ReadonlyArray<number[] | Float64Array>
  ): number {
    return this.fitness(targets as Matrix, predictions as Matrix)
  }

  toFactoryOptions(): SharedArrayBuffer {
    return datasetToSharedBuffer(this.dataset)
  }
}
