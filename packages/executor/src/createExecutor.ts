import { type Phenotype, PhenotypeActionType } from '@neat-js/phenotype'

import { toActivationFunction } from './toActivationFunction.js'
import type { Executor } from './Executor.js'
import type { ExecutorFactory } from './ExecutorFactory.js'

export const createExecutor: ExecutorFactory = (
  phenotype: Phenotype
): Executor => {
  const values: number[] = new Array(phenotype.length).fill(0)

  return async (inputs: number[]): Promise<number[]> => {
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
    const outputs = phenotype.outputs.map((o) =>
      Number.isFinite(values[o] as number) ? (values[o] as number) : 0
    )
    return outputs
  }
}
