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
      switch (action[0]) {
        case PhenotypeActionType.Link: {
          const [, actionFrom, actionTo, actionWeight] = action
          const from = values[actionFrom] as number
          values[actionTo] += from * actionWeight
          break
        }
        case PhenotypeActionType.Activation: {
          const [, actionNode, actionBias, actionActivation] = action
          const node = values[actionNode] as number
          const activation = toActivationFunction(actionActivation)
          values[actionNode] = activation(node + actionBias)
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
