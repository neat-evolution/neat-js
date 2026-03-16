import type { StaticExecutor } from '@neat-evolution/executor'
import type { WorkerEvaluationContext } from '../runtime/WorkerEvaluationContext.js'
import type { TrainingData } from './TrainingData.js'

export type TrainerFactoryOptions = Record<string, unknown>

export interface Trainer {
  train(data: TrainingData): void
}

export type TrainerFactory = (
  executor: StaticExecutor,
  trainerOptions: TrainerFactoryOptions,
  context?: WorkerEvaluationContext
) => Trainer
