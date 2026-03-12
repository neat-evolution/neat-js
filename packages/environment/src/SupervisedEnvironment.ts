export interface TrainingData {
  inputs: ReadonlyArray<number[] | Float64Array>
  targets: ReadonlyArray<number[] | Float64Array>
  count: number
}

export interface LossConfig {
  isClassification: boolean
  oneHotOutput: boolean
}

/**
 * Environments that provide supervised training data implement this.
 * Strategies check for this at runtime to access raw samples.
 */
export interface SupervisedEnvironment {
  getTrainingData(): TrainingData
  getValidationData(): TrainingData
  getLossConfig(): LossConfig
  /** Compute fitness from predictions vs targets using this environment's loss function. */
  computeFitness(
    targets: ReadonlyArray<number[] | Float64Array>,
    predictions: ReadonlyArray<number[] | Float64Array>
  ): number
}

/** Runtime type guard. */
export function isSupervisedEnvironment(
  env: unknown
): env is SupervisedEnvironment {
  return (
    typeof env === 'object' &&
    env !== null &&
    'getTrainingData' in env &&
    'getValidationData' in env &&
    'getLossConfig' in env &&
    'computeFitness' in env
  )
}
