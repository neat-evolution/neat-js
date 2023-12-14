import type { NodeRef, NodeRefTuple } from './NodeRef.js'
import type { NodeKey } from './nodeRefToKey.js'
import type { NodeType } from './NodeType.js'

/**
 * @param {NodeKey} key a node key in the form of `${type}${id}`
 * @returns {NodeRef} a node ref
 */
export const nodeKeyToRef = (key: NodeKey): NodeRef => {
  return {
    type: key.charAt(0) as NodeType,
    id: +key.substring(1),
  }
}

export const nodeKeyToType = (key: NodeKey): NodeType => {
  return key.charAt(0) as NodeType
}

export const nodeKeyToRefTuple = (key: NodeKey): NodeRefTuple => {
  return [key.charAt(0) as NodeType, +key.substring(1)]
}
