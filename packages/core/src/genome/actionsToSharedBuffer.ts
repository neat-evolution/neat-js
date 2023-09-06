import { NodeType, type NodeRef } from '../node/NodeData.js'

import type { Connections, Edge } from './Connections.js'

export type SerializedActions = SharedArrayBuffer

// FIXME: not used
export const actionsToSharedBuffer = <
  N extends NodeRef = NodeRef,
  E extends Edge = Edge
>(
  connections: Connections<N, E>
): SerializedActions => {
  // Count the total number of actions (for buffer size calculation)
  // + 1 byte for action type
  // + 1 byte for node type
  // + 4 bytes for each ID
  // + 8 bytes for each edge
  let bufferSize = 0
  const actions = new Set(connections.sortTopologically())
  for (const action of actions) {
    if (action.length === 3) {
      // Action type, from.type, from.id, to.type, to.id, edge
      bufferSize += 1 + 1 + 4 + 1 + 4 + 4
    } else if (action.length === 1) {
      // Action type, node.type, node.id
      bufferSize += 1 + 1 + 4
    }
  }

  const buffer = new SharedArrayBuffer(bufferSize)
  const view = new DataView(buffer)

  let offset = 0
  for (const action of actions) {
    if (action.length === 3) {
      // ActionEdge
      const [from, to, edge] = action
      const fromType =
        from.type === NodeType.Input ? 0 : from.type === NodeType.Hidden ? 1 : 2
      const toType =
        to.type === NodeType.Input ? 0 : to.type === NodeType.Hidden ? 1 : 2
      view.setUint8(offset, action.length) // 3 for ActionEdge
      offset += 1
      view.setUint8(offset, fromType)
      offset += 1
      view.setUint32(offset, from.id, true)
      offset += 4
      view.setUint8(offset, toType)
      offset += 1
      view.setUint32(offset, to.id, true)
      offset += 4
      view.setFloat64(offset, edge, true)
      offset += 8
    } else if (action.length === 1) {
      // ActionNode
      const [node] = action
      const nodeType =
        node.type === NodeType.Input ? 0 : node.type === NodeType.Hidden ? 1 : 2
      view.setUint8(offset, action.length) // 1 for ActionNode
      offset += 1
      view.setUint8(offset, nodeType)
      offset += 1
      view.setUint32(offset, node.id, true)
      offset += 4
    }
  }

  return buffer
}
