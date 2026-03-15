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
  StaticExecutor,
} from './Executor.js'
import type { ExecutorFactory } from './ExecutorFactory.js'
import {
  type ActivationFunction,
  toActivationFunction,
} from './toActivationFunction.js'

const LINK_ACTION = 0
const ACTIVATION_ACTION = 1

export const createExecutor: ExecutorFactory = (
  phenotype: Phenotype
): StaticExecutor => {
  const values = new Float64Array(phenotype.length)
  const outputsCount = phenotype.outputs.length
  const inputsCount = phenotype.inputs.length
  const actionCount = phenotype.actions.length

  const actionTypes = new Uint8Array(actionCount)
  const actionNodeOrFrom = new Int32Array(actionCount)
  const actionTo = new Int32Array(actionCount)
  const actionValue = new Float64Array(actionCount)
  const activationFns: Array<ActivationFunction | undefined> = new Array(
    actionCount
  )

  // Build output node → output index mapping
  const phenotypeOutputs = phenotype.outputs
  const outputIndexByNode = new Map<number, number>()
  for (let i = 0; i < outputsCount; i++) {
    const outputNode = phenotypeOutputs[i]
    if (outputNode !== undefined) {
      outputIndexByNode.set(outputNode, i)
    }
  }

  // Scan output activations per output index to build softmax groups
  const outputActivations = new Array<Activation>(outputsCount)

  for (let i = 0; i < actionCount; i++) {
    const action = phenotype.actions[i]
    if (action == null) {
      continue
    }

    actionTypes[i] =
      action[0] === PhenotypeActionType.Activation
        ? ACTIVATION_ACTION
        : LINK_ACTION
    actionNodeOrFrom[i] = action[1]

    if (action[0] === PhenotypeActionType.Activation) {
      actionValue[i] = action[2]
      activationFns[i] = toActivationFunction(action[3])
      const outputIdx = outputIndexByNode.get(action[1])
      if (outputIdx !== undefined) {
        outputActivations[outputIdx] = action[3]
      }
    } else {
      actionTo[i] = action[2]
      actionValue[i] = action[3]
    }
  }

  // Build softmax groups: contiguous ranges of outputs with Softmax activation
  const softmaxGroups: Array<{ start: number; end: number }> = []
  let groupStart = -1
  for (let i = 0; i < outputsCount; i++) {
    if (outputActivations[i] === Activation.Softmax) {
      if (groupStart === -1) {
        groupStart = i
      }
    } else {
      if (groupStart !== -1) {
        softmaxGroups.push({ start: groupStart, end: i })
        groupStart = -1
      }
    }
  }
  if (groupStart !== -1) {
    softmaxGroups.push({ start: groupStart, end: outputsCount })
  }

  const forward = (inputs: Inputs): Outputs => {
    // Clear network values - Float64Array.fill is very fast
    values.fill(0)

    // Copy inputs into values
    // Using simple for loop over typed array is extremely fast
    const inputsMap = phenotype.inputs
    for (let i = 0; i < inputsCount; i++) {
      const inputIndex = inputsMap[i]
      if (inputIndex !== undefined) {
        values[i] = inputs[inputIndex] ?? 0
      }
    }

    // Do forward pass
    for (let i = 0; i < actionCount; i++) {
      if (actionTypes[i] === LINK_ACTION) {
        const from = actionNodeOrFrom[i] as number
        const to = actionTo[i] as number
        const nextValue = values[to]
        const fromValue = values[from]
        const weight = actionValue[i]
        if (nextValue !== undefined && fromValue !== undefined) {
          values[to] = nextValue + fromValue * (weight ?? 0)
        }
      } else {
        const node = actionNodeOrFrom[i] as number
        const fn = activationFns[i] as ActivationFunction
        const nodeValue = values[node]
        const bias = actionValue[i]
        if (nodeValue !== undefined) {
          values[node] = fn(nodeValue + (bias ?? 0))
        }
      }
    }

    // Collect output
    const output = new Float64Array(outputsCount)
    for (let i = 0; i < outputsCount; i++) {
      const o = phenotypeOutputs[i]
      if (o !== undefined) {
        const value = values[o]
        output[i] = value !== undefined && Number.isFinite(value) ? value : 0
      }
    }

    // Normalize each softmax group independently
    for (const group of softmaxGroups) {
      let sum = 0
      for (let i = group.start; i < group.end; i++) {
        sum += output[i] as number
      }
      if (sum === 0) {
        continue
      }
      for (let i = group.start; i < group.end; i++) {
        output[i] = (output[i] as number) / sum
      }
    }

    return output
  }

  const forwardBatch = (batch: BatchInputs): BatchOutputs => {
    const outputs: BatchOutputs = new Array(batch.length)
    for (let i = 0; i < batch.length; i++) {
      const inputs = batch[i]
      if (inputs !== undefined) {
        outputs[i] = forward(inputs)
      }
    }
    return outputs
  }

  return {
    forward,
    forwardBatch,
  }
}
