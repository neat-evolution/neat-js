import { type Phenotype, PhenotypeActionType } from '@neat-js/core'

import { toActivationFunction } from './toActivationFunction.js'

export type SyncExecutorFactory = (phenotype: Phenotype) => SyncExecutor
export type SyncExecutor = (input: number[]) => number[]

export const createSyncExecutor: SyncExecutorFactory = (
  phenotype: Phenotype
): SyncExecutor => {
  const values: number[] = new Array(phenotype.length).fill(0)

  return (inputs: number[]) => {
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

    return output
  }
}
