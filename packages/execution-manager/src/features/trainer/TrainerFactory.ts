import type { StaticExecutor } from '@neat-evolution/executor'
import type { ExecutionManagerFactory } from '../runtime/ExecutionManagerFactory.js'
import type { TrainingData } from './TrainingData.js'

export type TrainerFactoryOptions = Record<string, unknown>

export interface Trainer {
  train(data: TrainingData): void
}

export type TrainerFactory = ExecutionManagerFactory<
  Trainer,
  TrainerFactoryOptions,
  StaticExecutor
>
