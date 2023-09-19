import type { Activation } from '@neat-js/core'
import type { Executor, ExecutorFactory } from '@neat-js/executor'
import { type Phenotype, PhenotypeActionType } from '@neat-js/phenotype'
import { GPU, Texture } from 'gpu.js'

import {
  toActivationKernel,
  type ActivationKernel,
} from './toActivationKernel.js'

const gpu = new GPU()

type AddWeightedLink = (
  from: Texture | Float32Array,
  to: Texture | Float32Array,
  weight: number
) => Texture

export const createExecutor: ExecutorFactory = (
  phenotype: Phenotype,
  batchSize: number
): Executor => {
  const addWeightedLink = gpu
    .createKernel(function (
      fromValues: number[],
      toValues: number[],
      weight: number
    ) {
      const i = this.thread.x
      const fromValue = fromValues[i] as number
      const toValue = toValues[i] as number
      const newValue = toValue + fromValue * weight
      return newValue
    })
    .setOutput([batchSize])
    .setImmutable(true)
    .setPipeline(true) as unknown as AddWeightedLink

  // Precompile all required activation kernels
  const activationKernelMap = new Map<Activation, ActivationKernel>()
  for (const action of phenotype.actions) {
    if (action.type === PhenotypeActionType.Activation) {
      const activationKernel = toActivationKernel(
        gpu,
        action.activation,
        batchSize
      )
      activationKernelMap.set(action.activation, activationKernel)
    }
  }

  return async (batch: number[][]) => {
    const nodeValues = new Map<number, Texture | Float32Array>()

    // pre-fill values map
    for (let i = 0; i < phenotype.length; i++) {
      const values = new Float32Array(batchSize)
      nodeValues.set(i, values)
    }

    // Copy inputs into values
    const inputValues: number[][] = Array.from(
      { length: phenotype.inputs.length },
      (_, i) => {
        return batch.map((row) => row[i] as number)
      }
    )
    for (const [i, index] of phenotype.inputs.entries()) {
      nodeValues.set(i, new Float32Array(inputValues[index] as number[]))
    }

    // Do forward pass
    for (const action of phenotype.actions) {
      switch (action.type) {
        case PhenotypeActionType.Link: {
          const fromValues = nodeValues.get(action.from) as
            | Texture
            | Float32Array
          const toValues = nodeValues.get(action.to) as Texture | Float32Array
          const newValue = addWeightedLink(fromValues, toValues, action.weight)

          // release old texture
          if (toValues instanceof Texture) {
            toValues.delete()
          }

          nodeValues.set(action.to, newValue)
          break
        }
        case PhenotypeActionType.Activation: {
          const activation = activationKernelMap.get(action.activation)
          if (activation === undefined) {
            throw new Error(
              `Activation kernel for ${action.activation} is undefined`
            )
          }
          const values = nodeValues.get(action.node) as Texture | Float32Array
          const newValues = activation(values, action.bias)

          // release old texture
          if (values instanceof Texture) {
            values.delete()
          }

          nodeValues.set(action.node, newValues)
          break
        }
      }
    }

    // Collect output by batch
    const outputs: number[][] = []
    for (const o of phenotype.outputs) {
      let values = nodeValues.get(o) as Texture | Float32Array
      if (values instanceof Texture) {
        values = values.toArray() as Float32Array
      }

      // const values = (nodeValues.get(o) as Texture).toArray() as Float32Array
      for (const [i, value] of values.entries()) {
        const output = outputs[i] ?? []
        output.push(value)
        outputs[i] = output
      }
    }

    // delete all textures
    for (const texture of nodeValues.values()) {
      if (texture instanceof Texture) {
        texture.delete()
      }
    }
    return outputs
  }
}
