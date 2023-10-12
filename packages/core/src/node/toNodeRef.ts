import type { CoreNode } from './CoreNode.js'
import type { NodeFactoryOptions } from './NodeFactoryOptions.js'
import type { NodeRef, NodeRefTuple } from './NodeRef.js'

export const isNode = <N extends CoreNode<any, any, any, any, N>>(
  node: N | NodeRef
): node is N => {
  return (node as N).toFactoryOptions != null
}

export const toNodeRef = <N extends CoreNode<any, any, any, any, N>>(
  node: N | NodeRef
): NodeRef => {
  if (isNode(node)) {
    return node.toFactoryOptions()
  }
  return { ...node }
}

export const toNodeRefTuple = <N extends CoreNode<any, any, any, any, N>>(
  node: N | NodeRef
): NodeRefTuple => {
  if (isNode(node)) {
    const { type, id } = node.toFactoryOptions() as NodeFactoryOptions
    return [type, id]
  }
  return [node.type, node.id]
}
