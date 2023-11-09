import { type Phenotype, PhenotypeActionType } from '@neat-evolution/core'

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
        case PhenotypeActionType.Link: {
          const from = values[action.from] as number
          values[action.to] += from * action.weight
          break
        }
        case PhenotypeActionType.Activation: {
          const node = values[action.node] as number
          const activation = toActivationFunction(action.activation)
          values[action.node] = activation(node + action.bias)
          break
        }
      }
    }

    // Collect output
    const output: number[] = []
    for (const o of phenotype.outputs) {
      const value = values[o] as number
      output.push(Number.isFinite(value) ? value : 0)
    }

    return output
  }
}
