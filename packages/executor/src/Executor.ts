export type Inputs = number[] | Float64Array
export type BatchInputs = Inputs[]
export type Outputs = number[] | Float64Array
export type BatchOutputs = Outputs[]

export interface StaticExecutor {
  forward(input: Inputs): Outputs
  forwardBatch(batch: BatchInputs): BatchOutputs
}

export type Executor = StaticExecutor

import type { TrainableExecutor } from './features/backprop/TrainableExecutor.js'

export function isTrainableExecutor(
  executor: unknown
): executor is TrainableExecutor {
  return (
    typeof executor === 'object' &&
    executor !== null &&
    'backward' in executor &&
    'getUpdatedActions' in executor &&
    'getWeightGradients' in executor &&
    'accumulateBackward' in executor &&
    'applyGradients' in executor
  )
}
