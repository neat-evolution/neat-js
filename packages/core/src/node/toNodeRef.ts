import type { Node } from './Node.js'
import type { NodeRef, NodeRefTuple } from './NodeRef.js'

export const isNode = <N extends Node<any, any, N>>(
  node: N | NodeRef
): node is N => {
  return (node as N).toFactoryOptions != null
}

export const toNodeRef = <N extends Node<any, any, N>>(
  node: N | NodeRef
): NodeRef => {
  if (isNode(node)) {
    return { type: node.type, id: node.id }
  }
  return { ...node }
}

export const toNodeRefTuple = <N extends Node<any, any, N>>(
  node: N | NodeRef
): NodeRefTuple => {
  if (isNode(node)) {
    return node.toFactoryOptions()
  }
  return [node.type, node.id]
}
