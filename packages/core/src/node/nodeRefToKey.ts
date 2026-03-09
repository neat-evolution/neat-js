import type { NodeId, NodeRef, NodeRefTuple } from './NodeRef.js'
import type { NodeType } from './NodeType.js'

const NODE_KEY_SHIFT = 0x100000000

const NODE_TYPE_TO_BITS: Record<NodeType, number> = {
  I: 0,
  H: 1,
  O: 2,
}

/** exact numeric node identity: type bits in high lane, 32-bit node id in low lane */
export type NodeKey = number

export const nodeRefToKey = (nodeRef: NodeRef): NodeKey => {
  return toNodeKey(nodeRef.type, nodeRef.id)
}

export const nodeTupleToKey = (nodeTuple: NodeRefTuple): NodeKey => {
  return toNodeKey(nodeTuple[0], nodeTuple[1])
}

export const toNodeKey = (type: NodeType, id: NodeId): NodeKey => {
  return NODE_TYPE_TO_BITS[type] * NODE_KEY_SHIFT + (id >>> 0)
}

export const nodeKeyShift = NODE_KEY_SHIFT
