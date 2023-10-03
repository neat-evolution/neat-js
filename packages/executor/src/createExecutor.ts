import { type Phenotype, PhenotypeActionType } from '@neat-js/core'

import type { Executor } from './Executor.js'
import type { ExecutorFactory } from './ExecutorFactory.js'
import { toActivationFunction } from './toActivationFunction.js'

export const createExecutor: ExecutorFactory = (
  phenotype: Phenotype
): Executor => {
  const values: number[] = new Array(phenotype.length).fill(0)

  return async (batch: number[][]) => {
    const outputs: number[][] = []

    for (const inputs of batch) {
      // Clear network values
      values.fill(0)

      // Copy inputs into values
      for (const [i, index] of phenotype.inputs.entries()) {
        values[i] = inputs[index] as number
      }

      // Do forward pass
      for (const action of phenotype.actions) {
        switch (action.type) {
          case PhenotypeActionType.Link:
            values[action.to] += (values[action.from] as number) * action.weight
            break
          case PhenotypeActionType.Activation: {
            const activation = toActivationFunction(action.activation)
            values[action.node] = activation(
              (values[action.node] as number) + action.bias
            )
            break
          }
        }
      }

      // Collect output
      const output: number[] = []
      for (const o of phenotype.outputs) {
        output.push(
          Number.isFinite(values[o] as number) ? (values[o] as number) : 0
        )
      }
      // Collect output by batch
      outputs.push(output)
    }
    return outputs
  }
}
