export type Inputs = number[]
export type BatchInputs = Inputs[]
export type Outputs = number[]
export type BatchOutputs = Outputs[]

export interface SyncExecutor {
  isAsync: false
  execute: (input: Inputs) => Outputs
  executeBatch: (batch: BatchInputs) => BatchOutputs
}
export interface AsyncExecutor {
  isAsync: true
  execute: (input: Inputs) => Promise<Outputs>
  executeBatch: (batch: BatchInputs) => Promise<BatchOutputs>
}

export type Executor = SyncExecutor | AsyncExecutor

export function isSyncExecutor(executor: Executor): executor is SyncExecutor {
  return !executor.isAsync
}

export function isAsyncExecutor(executor: Executor): executor is AsyncExecutor {
  return executor.isAsync
}
