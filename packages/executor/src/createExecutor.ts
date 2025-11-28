import {
  Activation,
  type Phenotype,
  PhenotypeActionType,
} from '@neat-evolution/core'

import type {
  BatchInputs,
  BatchOutputs,
  Inputs,
  Outputs,
  SyncExecutor,
} from './Executor.js'
import type { SyncExecutorFactory } from './ExecutorFactory.js'
import { softmax } from './softmax.js'
import { toActivationFunction } from './toActivationFunction.js'

export const createExecutor: SyncExecutorFactory = (
  phenotype: Phenotype
): SyncExecutor => {
  const values: number[] = new Array(phenotype.length).fill(0)

  const execute = (inputs: Inputs): Outputs => {
    // Clear network values
    values.fill(0)

    // Copy inputs into values
    for (const [i, index] of phenotype.inputs.entries()) {
      values[i] = inputs[index] ?? 0
    }

    // Do forward pass
    let outputActivation: Activation | undefined
    for (const action of phenotype.actions) {
      switch (action[0]) {
        case PhenotypeActionType.Link: {
          const [, actionFrom, actionTo, actionWeight] = action
          const from = values[actionFrom] as number
          if (values[actionTo] === undefined) {
            throw new Error(`Invalid actionTo index: ${actionTo}`)
          }
          values[actionTo] += from * actionWeight
          break
        }
        case PhenotypeActionType.Activation: {
          const [, actionNode, actionBias, actionActivation] = action
          if (
            outputActivation === undefined &&
            phenotype.outputs.includes(actionNode)
          ) {
            outputActivation = actionActivation
          }
          const node = values[actionNode] as number
          const activation = toActivationFunction(actionActivation)
          values[actionNode] = activation(node + actionBias)
          break
        }
      }
    }

    // Collect output
    const output: Outputs = []
    for (const o of phenotype.outputs) {
      const value = values[o] as number
      output.push(Number.isFinite(value) ? value : 0)
    }
    return outputActivation === Activation.Softmax
      ? softmax(output, true)
      : output
  }

  const executeBatch = (batch: BatchInputs): BatchOutputs => {
    const outputs: BatchOutputs = new Array(batch.length)

    let i = 0
    for (const inputs of batch) {
      // Collect output by batch
      outputs[i] = execute(inputs)
      i++
    }
    return outputs
  }

  return {
    isAsync: false,
    execute,
    executeBatch,
  }
}
