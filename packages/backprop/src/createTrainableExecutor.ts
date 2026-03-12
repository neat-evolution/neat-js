import {
  Activation,
  type Phenotype,
  type PhenotypeAction,
  PhenotypeActionType,
} from '@neat-evolution/core'
import {
  type ActivationFunction,
  toActivationFunction,
} from '@neat-evolution/executor'

import type { TrainableExecutor } from './TrainableExecutor.js'
import type { ActivationDerivative } from './toActivationDerivative.js'
import { toActivationDerivative } from './toActivationDerivative.js'

const LINK_ACTION = 0
const ACTIVATION_ACTION = 1

export function createTrainableExecutor(
  phenotype: Phenotype
): TrainableExecutor {
  const nodeCount = phenotype.length
  const outputsCount = phenotype.outputs.length
  const inputsCount = phenotype.inputs.length
  const actionCount = phenotype.actions.length

  // Pre-compiled action data (same as createExecutor)
  const actionTypes = new Uint8Array(actionCount)
  const actionNodeOrFrom = new Int32Array(actionCount)
  const actionTo = new Int32Array(actionCount)
  const actionWeights = new Float64Array(actionCount)
  const actionBiases = new Float64Array(actionCount)
  const activationFns: Array<ActivationFunction | undefined> = new Array(
    actionCount
  )
  const derivativeFns: Array<ActivationDerivative | undefined> = new Array(
    actionCount
  )

  // Track output activation for softmax post-processing
  const isOutputNode = new Uint8Array(nodeCount)
  const phenotypeOutputs = phenotype.outputs
  for (let i = 0; i < outputsCount; i++) {
    const outputNode = phenotypeOutputs[i]
    if (outputNode !== undefined) {
      isOutputNode[outputNode] = 1
    }
  }

  let outputActivation: Activation | undefined
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
      actionBiases[i] = action[2]
      activationFns[i] = toActivationFunction(action[3])
      derivativeFns[i] = toActivationDerivative(action[3])
      if (outputActivation === undefined && isOutputNode[action[1]] === 1) {
        outputActivation = action[3]
      }
    } else {
      actionTo[i] = action[2]
      actionWeights[i] = action[3]
    }
  }

  if (outputActivation === Activation.Softmax) {
    throw new Error(
      'Softmax output activation is not supported by the trainable executor. ' +
        'Use Sigmoid or Linear output activation instead.'
    )
  }

  // Per-node state for forward/backward passes
  const preActivation = new Float64Array(nodeCount)
  const postActivation = new Float64Array(nodeCount)
  const errors = new Float64Array(nodeCount)

  const forward = (inputs: number[] | Float64Array): Float64Array => {
    // Clear state
    preActivation.fill(0)
    postActivation.fill(0)

    // Copy inputs — input nodes have no activation, so pre = post = input value
    const inputsMap = phenotype.inputs
    for (let i = 0; i < inputsCount; i++) {
      const inputIndex = inputsMap[i]
      if (inputIndex !== undefined) {
        const value = inputs[inputIndex] ?? 0
        preActivation[i] = value
        postActivation[i] = value
      }
    }

    // Forward pass: process actions in topological order
    for (let i = 0; i < actionCount; i++) {
      if (actionTypes[i] === LINK_ACTION) {
        const from = actionNodeOrFrom[i] as number
        const to = actionTo[i] as number
        const weight = actionWeights[i] as number
        // Accumulate weighted input into pre-activation of target
        preActivation[to] =
          (preActivation[to] as number) +
          (postActivation[from] as number) * weight
      } else {
        const node = actionNodeOrFrom[i] as number
        const fn = activationFns[i] as ActivationFunction
        const bias = actionBiases[i] as number
        // Add bias to accumulated sum
        const z = (preActivation[node] as number) + bias
        preActivation[node] = z
        postActivation[node] = fn(z)
      }
    }

    // Collect outputs
    const output = new Float64Array(outputsCount)
    for (let i = 0; i < outputsCount; i++) {
      const o = phenotypeOutputs[i]
      if (o !== undefined) {
        const value = postActivation[o]
        output[i] = value !== undefined && Number.isFinite(value) ? value : 0
      }
    }
    return output
  }

  const backward = (outputErrors: Float64Array, learningRate: number): void => {
    // Initialize errors to zero
    errors.fill(0)

    // Inject output errors (dL/d_postActivation for output nodes)
    for (let i = 0; i < outputsCount; i++) {
      const o = phenotypeOutputs[i]
      if (o !== undefined) {
        errors[o] = outputErrors[i] as number
      }
    }

    // Walk actions in reverse topological order
    for (let i = actionCount - 1; i >= 0; i--) {
      if (actionTypes[i] === ACTIVATION_ACTION) {
        const node = actionNodeOrFrom[i] as number
        const dfn = derivativeFns[i] as ActivationDerivative
        const z = preActivation[node] as number
        const a = postActivation[node] as number
        // Convert error from post-activation to pre-activation space
        const preError = (errors[node] as number) * dfn(z, a)
        errors[node] = preError
        // Update bias: bias -= lr * dL/dz
        actionBiases[i] = (actionBiases[i] as number) - learningRate * preError
      } else {
        const from = actionNodeOrFrom[i] as number
        const to = actionTo[i] as number
        const weight = actionWeights[i] as number
        // Weight gradient: dL/dw = error_to * activation_from
        const errorTo = errors[to] as number
        const weightGrad = errorTo * (postActivation[from] as number)
        // Propagate error to source node (in post-activation space)
        errors[from] = (errors[from] as number) + errorTo * weight
        // Update weight
        actionWeights[i] = weight - learningRate * weightGrad
      }
    }
  }

  const getUpdatedActions = (): PhenotypeAction[] => {
    const actions: PhenotypeAction[] = new Array(actionCount)
    for (let i = 0; i < actionCount; i++) {
      const original = phenotype.actions[i]
      if (original == null) {
        continue
      }
      if (actionTypes[i] === ACTIVATION_ACTION) {
        actions[i] = [
          PhenotypeActionType.Activation,
          original[1],
          actionBiases[i] as number,
          original[3] as Activation,
        ]
      } else {
        actions[i] = [
          PhenotypeActionType.Link,
          original[1],
          original[2] as number,
          actionWeights[i] as number,
        ]
      }
    }
    return actions
  }

  return { forward, backward, getUpdatedActions }
}
