import { type Phenotype } from '@neat-js/core'

import { createSyncExecutor } from './createSyncExecutor.js'
import type { Executor } from './Executor.js'
import type { ExecutorFactory } from './ExecutorFactory.js'

// Create an executor that can execute a batch of inputs, acts like worker-executor
export const createExecutor: ExecutorFactory = (
  phenotype: Phenotype
): Executor => {
  const execute = createSyncExecutor(phenotype)
  return async (batch: number[][]) => {
    const outputs: number[][] = []

    for (const inputs of batch) {
      // Collect output by batch
      outputs.push(execute(inputs))
    }
    return outputs
  }
}
