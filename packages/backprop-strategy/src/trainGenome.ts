import type { Phenotype } from '@neat-evolution/core'
import type { SupervisedEnvironment } from '@neat-evolution/environment'
import { createTrainableExecutor } from '@neat-evolution/executor'

import type { TrainGenomeResult } from './actions.js'

export interface TrainGenomeOptions {
  trainingEpochs: number
  learningRate: number
  isLamarckian: boolean
}

/**
 * Train a phenotype on supervised data, score fitness on validation.
 * Used by both the worker plugin and the strategy's local path.
 */
export function trainGenome(
  phenotype: Phenotype,
  environment: SupervisedEnvironment,
  options: TrainGenomeOptions
): TrainGenomeResult {
  const trainable = createTrainableExecutor(phenotype)
  const { trainingEpochs, learningRate, isLamarckian } = options
  const training = environment.getTrainingData()

  for (let epoch = 0; epoch < trainingEpochs; epoch++) {
    for (let s = 0; s < training.count; s++) {
      const input = training.inputs[s]
      const target = training.targets[s]
      if (input === undefined || target === undefined) {
        continue
      }
      const output = trainable.forward(input)
      const errors = new Float64Array(output.length)
      for (let j = 0; j < output.length; j++) {
        errors[j] = (output[j] as number) - (target[j] as number)
      }
      trainable.backward(errors, learningRate)
    }
  }

  const validation = environment.getValidationData()
  const predictions = validation.inputs.map((input) => trainable.forward(input))
  const fitness = environment.computeFitness(validation.targets, predictions)

  const result: TrainGenomeResult = { fitness }
  if (isLamarckian) {
    result.updatedActions = trainable.getUpdatedActions()
  }
  return result
}
