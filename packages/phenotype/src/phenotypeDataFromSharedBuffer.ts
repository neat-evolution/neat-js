import { activationFromNumber } from '@neat-js/core'

import { PhenotypeActionType, type PhenotypeAction } from './PhenotypeAction.js'
import type { PhenotypeData, SerializedPhenotypeData } from './PhenotypeData.js'

export const phenotypeDataFromSharedBuffer = (
  serializedPhenotypData: SerializedPhenotypeData
): PhenotypeData => {
  const view = new DataView(serializedPhenotypData)
  let offset = 0

  // Deserialize speciesIndex
  const speciesIndex = view.getInt32(offset, true)
  offset += 4

  // Deserialize organismIndex
  const organismIndex = view.getInt32(offset, true)
  offset += 4

  // Deserialize length
  const length = view.getInt32(offset, true)
  offset += 4

  // Deserialize inputs
  const inputCount = view.getInt32(offset, true)
  offset += 4
  const inputs: number[] = []
  for (let i = 0; i < inputCount; i++) {
    inputs.push(view.getInt32(offset, true))
    offset += 4
  }

  // Deserialize outputs
  const outputCount = view.getInt32(offset, true)
  offset += 4
  const outputs: number[] = []
  for (let i = 0; i < outputCount; i++) {
    outputs.push(view.getInt32(offset, true))
    offset += 4
  }

  // Deserialize actions
  const actions: PhenotypeAction[] = []
  while (offset < serializedPhenotypData.byteLength) {
    const actionType = view.getUint8(offset) // 0 for Link, 1 for Activation
    offset += 1
    if (actionType === 0) {
      const from = view.getInt32(offset, true)
      offset += 4
      const to = view.getInt32(offset, true)
      offset += 4
      const weight = view.getFloat64(offset, true)
      offset += 8
      actions.push({ type: PhenotypeActionType.Link, from, to, weight })
    } else if (actionType === 1) {
      const node = view.getInt32(offset, true)
      offset += 4
      const bias = view.getFloat64(offset, true)
      offset += 8
      const activation = view.getUint8(offset)
      offset += 1
      actions.push({
        type: PhenotypeActionType.Activation,
        node,
        bias,
        activation: activationFromNumber(activation),
      })
    }
  }

  return [
    speciesIndex,
    organismIndex,
    {
      length,
      inputs,
      outputs,
      actions,
    },
  ]
}
