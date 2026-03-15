import type { StaticExecutor } from '@neat-evolution/executor'
import type { TrainingData } from './SupervisedEnvironment.js'
import type { WorkerEvaluationContext } from './WorkerEvaluationContext.js'

export type TrainerFactoryOptions = Record<string, unknown>

export interface Trainer {
  train(
    data: TrainingData,
    options: { epochs: number; learningRate: number }
  ): void
}

export type TrainerFactory = (
  executor: StaticExecutor,
  trainerOptions: TrainerFactoryOptions,
  context?: WorkerEvaluationContext
) => Trainer
