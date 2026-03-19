import type {
  Environment,
  EnvironmentDescription,
  SupervisedEnvironment,
} from '@neat-evolution/environment'
import type {
  EnvironmentInitOptions,
  LossConfig,
  PartialEvaluationContext,
  TrainerFactory,
  TrainerFactoryOptions,
  TrainingData,
} from '@neat-evolution/execution-manager'
import type { StaticExecutor } from '@neat-evolution/executor'

import type { Dataset } from './Dataset.js'
import { datasetToSharedBuffer } from './datasetToSharedBuffer.js'
import { crossentropy, mse } from './error.js'
import type { Matrix } from './types.js'

export class DatasetEnvironment
  implements
    Environment<SharedArrayBuffer>,
    SupervisedEnvironment<SharedArrayBuffer>
{
  public readonly dataset: Dataset
  public readonly description: EnvironmentDescription
  public readonly isAsync = false
  private readonly initOptions:
    | EnvironmentInitOptions<TrainerFactory, TrainerFactoryOptions>
    | undefined

  constructor(dataset: Dataset, initOptions?: EnvironmentInitOptions) {
    this.dataset = dataset
    this.description = {
      inputs: dataset.dimensions.inputs,
      outputs: dataset.dimensions.outputs,
    }
    this.initOptions = initOptions as
      | EnvironmentInitOptions<TrainerFactory, TrainerFactoryOptions>
      | undefined
  }

  evaluate(
    executor: StaticExecutor,
    context?: PartialEvaluationContext
  ): number {
    if (this.initOptions?.createExecutionManager != null) {
      // Supervised: train on training split, score on validation split
      const options = (this.initOptions?.executionManagerFactoryOptions ??
        {}) as TrainerFactoryOptions
      const trainer = this.initOptions.createExecutionManager(
        executor,
        options,
        context
      )
      trainer.train(this.getTrainingData())
      const validation = this.getValidationData()
      const predictions = executor.forwardBatch(
        validation.inputs as (number[] | Float64Array)[]
      )
      return this.computeFitness(validation.targets, predictions)
    }
    // Direct: no training, score on training split
    const predictions = executor.forwardBatch(this.dataset.trainingInputs)
    return this.computeFitness(this.dataset.trainingTargets, predictions)
  }

  async evaluateAsync(
    executor: StaticExecutor,
    context?: PartialEvaluationContext
  ): Promise<number> {
    return this.evaluate(executor, context)
  }

  evaluateBatch(
    executors: StaticExecutor[],
    context?: PartialEvaluationContext
  ): number[] {
    return executors.map((executor) => this.evaluate(executor, context))
  }

  async evaluateBatchAsync(
    executors: StaticExecutor[],
    context?: PartialEvaluationContext
  ): Promise<number[]> {
    const promises = executors.map(
      async (executor) => await this.evaluateAsync(executor, context)
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
    const norm = this.dataset.isClassification && this.dataset.oneHotOutput
    if (norm) {
      return Math.exp(
        -crossentropy(targets as Matrix, predictions as Matrix, norm)
      )
    }
    const e = 1.0 - mse(targets as Matrix, predictions as Matrix, norm)
    return Number.isFinite(e) ? e : 0.0
  }

  toFactoryOptions(): SharedArrayBuffer {
    return datasetToSharedBuffer(this.dataset)
  }
}
