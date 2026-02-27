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
import {
  type ActivationFunction,
  toActivationFunction,
} from './toActivationFunction.js'

export const createExecutor: SyncExecutorFactory = (
  phenotype: Phenotype
): SyncExecutor => {
  const values = new Float64Array(phenotype.length)
  const outputsCount = phenotype.outputs.length
  const inputsCount = phenotype.inputs.length

  // Pre-calculate activation functions for each activation action
  const actionsWithFunctions = phenotype.actions.map((action) => {
    if (action[0] === PhenotypeActionType.Activation) {
      return {
        type: PhenotypeActionType.Activation,
        node: action[1],
        bias: action[2],
        fn: toActivationFunction(action[3]),
        activation: action[3],
      } as const
    }
    return {
      type: PhenotypeActionType.Link,
      from: action[1],
      to: action[2],
      weight: action[3],
    } as const
  })

  // Fast lookup for output activation
  let outputActivation: Activation | undefined
  const outputSet = new Set(phenotype.outputs)
  for (const action of phenotype.actions) {
    if (
      action[0] === PhenotypeActionType.Activation &&
      outputSet.has(action[1])
    ) {
      outputActivation = action[3]
      break
    }
  }

  const execute = (inputs: Inputs): Outputs => {
    // Clear network values - Float64Array.fill is very fast
    values.fill(0)

    // Copy inputs into values
    // Using simple for loop over typed array is extremely fast
    const inputsMap = phenotype.inputs
    for (let i = 0; i < inputsCount; i++) {
      const inputIndex = inputsMap[i]
      if (inputIndex !== undefined) {
        values[i] = (inputs as any)[inputIndex] ?? 0
      }
    }

    // Do forward pass
    for (let i = 0; i < actionsWithFunctions.length; i++) {
      const action = actionsWithFunctions[i]!

      if (action.type === PhenotypeActionType.Link) {
        // Use non-null assertion as we know these indices are within bounds
        values[action.to]! += values[action.from]! * action.weight
      } else {
        const fn = action.fn as ActivationFunction
        values[action.node] = fn(values[action.node]! + action.bias)
      }
    }

    // Collect output
    const output = new Float64Array(outputsCount)
    const phenotypeOutputs = phenotype.outputs
    for (let i = 0; i < outputsCount; i++) {
      const o = phenotypeOutputs[i]
      if (o !== undefined) {
        const value = values[o]
        output[i] = value !== undefined && Number.isFinite(value) ? value : 0
      }
    }

    if (outputActivation === Activation.Softmax) {
      return softmax(Array.from(output), true)
    }
    return output
  }

  const executeBatch = (batch: BatchInputs): BatchOutputs => {
    const outputs: BatchOutputs = new Array(batch.length)
    for (let i = 0; i < batch.length; i++) {
      const inputs = batch[i]
      if (inputs !== undefined) {
        outputs[i] = execute(inputs)
      }
    }
    return outputs
  }

  return {
    isAsync: false,
    execute,
    executeBatch,
  }
}
