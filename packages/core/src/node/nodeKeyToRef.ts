import type { NodeRef, NodeRefTuple } from './NodeRef.js'
import type { NodeKey } from './nodeRefToKey.js'
import type { NodeType } from './NodeType.js'
import { nodeTypeToNumber } from './nodeTypeToNumber.js'

/**
 * @param {NodeKey} key a node key in the form of `${type}[${id}]`
 * @returns {NodeRef} a node ref
 */
export const nodeKeyToRef = (key: NodeKey): NodeRef => {
  const bracketIndex = key.indexOf('[')
  return {
    type: key.substring(0, bracketIndex) as NodeType,
    id: +key.substring(bracketIndex + 1, key.length - 1),
  }
}

export const nodeKeyToType = (key: NodeKey): NodeType => {
  return key.substring(0, key.indexOf('[')) as NodeType
}

export const nodeKeyToRefTuple = (key: NodeKey): NodeRefTuple => {
  const bracketIndex = key.indexOf('[')
  return [
    key.substring(0, bracketIndex) as NodeType,
    +key.substring(bracketIndex + 1, key.length - 1),
  ]
}

/**
 * Used in toSharedBuffer
 * @param {NodeKey} key  a node key in the form of `${type}[${id}]`
 * @returns {[type: number, id: number]} a tuple of node type and id
 */
export const nodeKeyToNumericTuple = (
  key: NodeKey
): [type: number, id: number] => {
  const bracketIndex = key.indexOf('[')
  return [
    nodeTypeToNumber(key.substring(0, bracketIndex) as NodeType),
    +key.substring(bracketIndex + 1, key.length - 1),
  ]
}
