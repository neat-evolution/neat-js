import type { NodeRef, NodeRefTuple } from './NodeRef.js'
import { NodeType } from './NodeType.js'
import { type NodeKey, nodeKeyShift } from './nodeRefToKey.js'

const bitsToNodeType = (bits: number): NodeType => {
  switch (bits) {
    case 0:
      return NodeType.Input
    case 1:
      return NodeType.Hidden
    case 2:
      return NodeType.Output
    default:
      throw new Error(`Unknown node key type bits: ${bits}`)
  }
}

export const nodeKeyToRef = (key: NodeKey): NodeRef => {
  return {
    type: bitsToNodeType(Math.floor(key / nodeKeyShift)),
    id: key >>> 0,
  }
}

export const nodeKeyToType = (key: NodeKey): NodeType => {
  return bitsToNodeType(Math.floor(key / nodeKeyShift))
}

export const nodeKeyToId = (key: NodeKey): number => {
  return key >>> 0
}

export const nodeKeyToRefTuple = (key: NodeKey): NodeRefTuple => {
  return [nodeKeyToType(key), nodeKeyToId(key)]
}
