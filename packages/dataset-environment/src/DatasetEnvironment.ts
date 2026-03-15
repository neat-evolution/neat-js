import type {
  Environment,
  EnvironmentDescription,
  EnvironmentRuntimeOptions,
  LossConfig,
  RuntimeConfigurable,
  SupervisedEnvironment,
  TrainerFactoryOptions,
  TrainingData,
} from '@neat-evolution/environment'
import type { StaticExecutor } from '@neat-evolution/executor'

import type { Dataset } from './Dataset.js'
import { datasetToSharedBuffer } from './datasetToSharedBuffer.js'
import { crossentropy, mse } from './error.js'
import type { Matrix } from './types.js'

export class DatasetEnvironment
  implements
    Environment<SharedArrayBuffer>,
    SupervisedEnvironment,
    RuntimeConfigurable
{
  public readonly dataset: Dataset
  public readonly description: EnvironmentDescription
  public readonly isAsync = false
  private runtimeOptions: EnvironmentRuntimeOptions | undefined

  constructor(dataset: Dataset) {
    this.dataset = dataset
    this.description = {
      inputs: dataset.dimensions.inputs,
      outputs: dataset.dimensions.outputs,
    }
  }

  setRuntimeOptions(options: EnvironmentRuntimeOptions): void {
    this.runtimeOptions = options
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
    if (this.runtimeOptions?.trainerFactory != null) {
      const options = (this.runtimeOptions?.trainerFactoryOptions ??
        {}) as TrainerFactoryOptions
      const trainer = this.runtimeOptions.trainerFactory(
        executor,
        options,
        this.runtimeOptions.evaluationContext
      )
      trainer.train(this.getTrainingData())
      const validation = this.getValidationData()
      const predictions = executor.forwardBatch(
        validation.inputs as (number[] | Float64Array)[]
      )
      return this.computeFitness(validation.targets, predictions)
    }
    const predictions = executor.forwardBatch(this.dataset.trainingInputs)
    return this.fitness(this.dataset.trainingTargets, predictions)
  }

  async evaluateAsync(executor: StaticExecutor): Promise<number> {
    return this.evaluate(executor)
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
