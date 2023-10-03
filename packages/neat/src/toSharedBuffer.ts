import { nodeKeyToTuple } from '@neat-js/core'

import type { DefaultNEATGenomeFactoryOptions } from './DefaultNEATGenome.js'

export const toSharedBuffer = (
  data: DefaultNEATGenomeFactoryOptions
): SharedArrayBuffer => {
  // Calculate buffer size
  const hiddenNodesSize = data.hiddenNodes.length * 2
  const linksSize = data.links.length * 6 // from tuple, to tuple, weight, innovation
  const metadataSize = 2 // Lengths of hiddenNodes and links arrays
  const totalSize = hiddenNodesSize + linksSize + metadataSize

  // Initialize SharedArrayBuffer and DataView
  const buffer = new SharedArrayBuffer(
    totalSize * Float64Array.BYTES_PER_ELEMENT
  )
  const view = new DataView(buffer)

  // Populate buffer
  let offset = 0

  // Metadata
  view.setFloat64(offset, data.hiddenNodes.length, true)
  offset += Float64Array.BYTES_PER_ELEMENT
  view.setFloat64(offset, data.links.length, true)
  offset += Float64Array.BYTES_PER_ELEMENT

  // Hidden Nodes
  for (const node of data.hiddenNodes) {
    view.setFloat64(offset, 1, true)
    offset += Float64Array.BYTES_PER_ELEMENT // type
    view.setFloat64(offset, node[1].id, true)
    offset += Float64Array.BYTES_PER_ELEMENT // id
  }

  // Links
  for (const link of data.links) {
    const from = nodeKeyToTuple(link[1][0])
    const to = nodeKeyToTuple(link[1][1])
    view.setFloat64(offset, from[0], true)
    offset += Float64Array.BYTES_PER_ELEMENT
    view.setFloat64(offset, from[1], true)
    offset += Float64Array.BYTES_PER_ELEMENT
    view.setFloat64(offset, to[0], true)
    offset += Float64Array.BYTES_PER_ELEMENT
    view.setFloat64(offset, to[1], true)
    offset += Float64Array.BYTES_PER_ELEMENT
    view.setFloat64(offset, link[1][2], true)
    offset += Float64Array.BYTES_PER_ELEMENT
    view.setFloat64(offset, link[1][3], true)
    offset += Float64Array.BYTES_PER_ELEMENT
  }

  return buffer
}
