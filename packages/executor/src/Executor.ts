export type Inputs = number[] | Float64Array
export type BatchInputs = Inputs[]
export type Outputs = number[] | Float64Array
export type BatchOutputs = Outputs[]

export interface StaticExecutor {
  forward(input: Inputs): Outputs
  forwardBatch(batch: BatchInputs): BatchOutputs
}

export type Executor = StaticExecutor

// Structural guard — avoids circular dep with @neat-evolution/backprop
export function isTrainableExecutor(
  executor: unknown
): executor is StaticExecutor & {
  backward: (outputErrors: Float64Array, learningRate: number) => void
  getUpdatedActions: () => unknown[]
} {
  return (
    typeof executor === 'object' &&
    executor !== null &&
    'backward' in executor &&
    'getUpdatedActions' in executor
  )
}
