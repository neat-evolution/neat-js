import { tupleToNodeKey, NodeType } from '@neat-js/core'

import type { DefaultNEATGenomeFactoryOptions } from './DefaultNEATGenome.js'

export const fromSharedBuffer = (
  buffer: SharedArrayBuffer
): DefaultNEATGenomeFactoryOptions => {
  const view = new DataView(buffer)

  let offset = 0
  const hiddenNodesLength = view.getFloat64(offset, true)
  offset += Float64Array.BYTES_PER_ELEMENT
  const linksLength = view.getFloat64(offset, true)
  offset += Float64Array.BYTES_PER_ELEMENT

  const hiddenNodes: any[] = []
  for (let i = 0; i < hiddenNodesLength; i++) {
    // const type = view.getFloat64(offset, true) // always NodeType.Hidden
    offset += Float64Array.BYTES_PER_ELEMENT
    const id = view.getFloat64(offset, true)
    offset += Float64Array.BYTES_PER_ELEMENT
    hiddenNodes.push([`Hidden[${id}]`, { type: NodeType.Hidden, id }])
  }

  const links: any[] = []
  for (let i = 0; i < linksLength; i++) {
    const fromType = view.getFloat64(offset, true)
    offset += Float64Array.BYTES_PER_ELEMENT
    const fromId = view.getFloat64(offset, true)
    offset += Float64Array.BYTES_PER_ELEMENT
    const toType = view.getFloat64(offset, true)
    offset += Float64Array.BYTES_PER_ELEMENT
    const toId = view.getFloat64(offset, true)
    offset += Float64Array.BYTES_PER_ELEMENT
    const weight = view.getFloat64(offset, true)
    offset += Float64Array.BYTES_PER_ELEMENT
    const innovation = view.getFloat64(offset, true)
    offset += Float64Array.BYTES_PER_ELEMENT
    links.push([
      `${tupleToNodeKey([fromType, fromId])} -> ${tupleToNodeKey([
        toType,
        toId,
      ])}`,
      [
        tupleToNodeKey([fromType, fromId]),
        tupleToNodeKey([toType, toId]),
        weight,
        innovation,
      ],
    ])
  }

  return {
    hiddenNodes,
    links,
    isSafe: true,
  }
}
