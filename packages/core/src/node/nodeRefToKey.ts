import type { NodeRef } from './NodeData.js'

/** `${type}[${id}]` */
export type NodeKey = string

export const nodeRefToKey = (nodeRef: NodeRef): string => {
  return toNodeKey(nodeRef.type, nodeRef.id)
}

export const toNodeKey = (type: NodeRef['type'], id: NodeRef['id']): string => {
  return `${type}[${id}]`
}
