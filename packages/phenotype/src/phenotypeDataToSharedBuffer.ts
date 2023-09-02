import { activationToNumber } from '@neat-js/core'

import {
  isPhenotypeActivationAction,
  isPhenotypeLinkAction,
} from './PhenotypeAction.js'
import type { PhenotypeData, SerializedPhenotypeData } from './PhenotypeData.js'

export const phenotypeDataToSharedBuffer = (
  phenotypeData: PhenotypeData
): SerializedPhenotypeData => {
  const [speciesIndex, organismIndex, phenotype] = phenotypeData

  // Calculate the buffer size
  // speciesIndex, organismIndex, length, inputs, outputs
  let bufferSize =
    4 + // speciesIndex
    4 + // organismIndex
    4 + // length
    4 + // inputs
    phenotype.inputs.length * 4 +
    4 + // outputs
    phenotype.outputs.length * 4

  // actions
  for (const action of phenotype.actions) {
    if (isPhenotypeLinkAction(action)) {
      // type, from, to, weight
      bufferSize += 1 + 4 + 4 + 8
    } else if (isPhenotypeActivationAction(action)) {
      // type, node, bias, activation
      bufferSize += 1 + 4 + 8 + 1
    }
  }

  const buffer = new SharedArrayBuffer(bufferSize)
  const view = new DataView(buffer)
  let offset = 0

  // Serialize speciesIndex
  view.setInt32(offset, speciesIndex, true)
  offset += 4

  // Serialize organismIndex
  view.setInt32(offset, organismIndex, true)
  offset += 4

  // Serialize length
  view.setInt32(offset, phenotype.length, true)
  offset += 4

  // Serialize inputs
  view.setInt32(offset, phenotype.inputs.length, true)
  offset += 4
  for (const input of phenotype.inputs) {
    view.setInt32(offset, input, true)
    offset += 4
  }

  // Serialize outputs
  view.setInt32(offset, phenotype.outputs.length, true)
  offset += 4
  for (const output of phenotype.outputs) {
    view.setInt32(offset, output, true)
    offset += 4
  }

  // Serialize actions
  for (const action of phenotype.actions) {
    if (isPhenotypeLinkAction(action)) {
      view.setUint8(offset, 0) // 0 for Link
      offset += 1
      view.setInt32(offset, action.from, true)
      offset += 4
      view.setInt32(offset, action.to, true)
      offset += 4
      view.setFloat64(offset, action.weight, true)
      offset += 8
    } else if (isPhenotypeActivationAction(action)) {
      view.setUint8(offset, 1) // 1 for Activation
      offset += 1
      view.setInt32(offset, action.node, true)
      offset += 4
      view.setFloat64(offset, action.bias, true)
      offset += 8
      view.setUint8(offset, activationToNumber(action.activation)) // assuming activation can be represented in a byte
      offset += 1
    }
  }

  return buffer
}
