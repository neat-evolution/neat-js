import type { NodeRef, NodeRefTuple } from './NodeRef.js'
import { nodeNumberToType } from './nodeTypeToNumber.js'

/** `${type}[${id}]` */
export type NodeKey = string

export const nodeRefToKey = (nodeRef: NodeRef): string => {
  return nodeRef.type + '[' + nodeRef.id + ']'
}

export const nodeTupleToKey = (nodeTuple: NodeRefTuple): string => {
  return nodeTuple[0] + '[' + nodeTuple[1] + ']'
}

/**
 * Used in fromSharedBuffer
 * @param {[type: number, id: number]} param0 a tuple of node type and id
 * @returns {string} a node key in the form of `${type}[${id}]`
 */
export const numericTupleToNodeKey = ([type, id]: [
  type: number,
  id: number
]): NodeKey => `${nodeNumberToType(type)}[${id}]`

export const toNodeKey = (type: NodeRef['type'], id: NodeRef['id']): string => {
  return type + '[' + id + ']'
}
