import type { NodeId, NodeRef, NodeRefTuple } from './NodeRef.js'
import type { NodeType } from './NodeType.js'

/** `${type}${id}` */
export type NodeKey = string

export const nodeRefToKey = (nodeRef: NodeRef): string => {
  return nodeRef.type + nodeRef.id
}

export const nodeTupleToKey = (nodeTuple: NodeRefTuple): string => {
  return nodeTuple[0] + nodeTuple[1]
}

export const toNodeKey = (type: NodeType, id: NodeId): string => {
  return type + id
}
