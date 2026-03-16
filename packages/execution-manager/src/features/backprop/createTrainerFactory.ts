import type { StaticExecutor } from '@neat-evolution/executor'
import { isTrainableExecutor } from '@neat-evolution/executor'
import type { PartialEvaluationContext } from '../runtime/EnvironmentRuntimeOptions.js'
import type {
  Trainer,
  TrainerFactory,
  TrainerFactoryOptions,
} from '../trainer/TrainerFactory.js'
import type { TrainingData } from '../trainer/TrainingData.js'

export interface BackpropTrainerFactoryOptions extends TrainerFactoryOptions {
  learningRate: number
  epochs: number
  isLamarckian?: boolean
}

function isBackpropTrainerFactoryOptions(
  options: TrainerFactoryOptions
): options is BackpropTrainerFactoryOptions {
  return (
    'learningRate' in options &&
    typeof options.learningRate === 'number' &&
    'epochs' in options &&
    typeof options.epochs === 'number'
  )
}

/**
 * Trainer factory for backprop-based supervised training.
 *
 * Creates a Trainer that runs a forward/backward loop on a trainable
 * executor. Training config (learningRate, epochs) is captured from
 * trainerOptions. Schedules Lamarckian writeback via context.
 */
export const createTrainer: TrainerFactory = (
  executor: StaticExecutor,
  trainerOptions: TrainerFactoryOptions,
  context?: PartialEvaluationContext
) => {
  if (!isTrainableExecutor(executor)) {
    throw new Error('Backprop trainer factory requires a TrainableExecutor')
  }
  if (!isBackpropTrainerFactoryOptions(trainerOptions)) {
    throw new Error(
      'Backprop trainer factory requires { learningRate: number, epochs: number }'
    )
  }

  const { learningRate, epochs, isLamarckian } = trainerOptions

  if (isLamarckian !== false && context != null) {
    context.scheduleWriteback?.(executor)
  }

  const trainer: Trainer = {
    train(data: TrainingData): void {
      for (let epoch = 0; epoch < epochs; epoch++) {
        for (let s = 0; s < data.count; s++) {
          const input = data.inputs[s]
          const target = data.targets[s]
          if (input === undefined || target === undefined) {
            continue
          }
          const output = executor.forward(input)
          const errors = new Float64Array(output.length)
          for (let j = 0; j < output.length; j++) {
            errors[j] = (output[j] as number) - (target[j] as number)
          }
          executor.backward(errors, learningRate)
        }
      }
    },
  }

  return trainer
}

export default createTrainer
