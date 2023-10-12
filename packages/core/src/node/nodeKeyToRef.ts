import type { NodeRef, NodeRefTuple } from './NodeRef.js'
import type { NodeKey } from './nodeRefToKey.js'
import type { NodeType } from './NodeType.js'
import { nodeTypeToNumber, nodeNumberToType } from './nodeTypeToNumber.js'

/**
 * @param {NodeKey} key a node key in the form of `${type}[${id}]`
 * @returns {NodeRef} a node ref
 */
export const nodeKeyToRef = (key: NodeKey): NodeRef => {
  const [type, id] = key.split('[') as [type: string, id: string]
  return {
    type: type as NodeType,
    id: Number(id.slice(0, -1)),
  }
}

export const nodeKeyToType = (key: NodeKey): NodeType => {
  const [type] = key.split('[') as [type: string, id: string]
  return type as NodeType
}

export const nodeKeyToRefTuple = (key: NodeKey): NodeRefTuple => {
  const [type, id] = key.split('[') as [type: string, id: string]
  return [type as NodeType, Number(id.slice(0, -1))]
}

/**
 * Used in toSharedBuffer
 * @param {NodeKey} key  a node key in the form of `${type}[${id}]`
 * @returns {[type: number, id: number]} a tuple of node type and id
 */
export const nodeKeyToNumericTuple = (
  key: NodeKey
): [type: number, id: number] => {
  const [type, id] = key.split('[') as [type: string, id: string]
  return [nodeTypeToNumber(type as NodeType), Number(id.slice(0, -1))]
}

/**
 * Used in fromSharedBuffer
 * @param {[type: number, id: number]} param0 a tuple of node type and id
 * @returns {string} a node key in the form of `${type}[${id}]`
 */
export const tupleToNodeKey = ([type, id]: [
  type: number,
  id: number
]): NodeKey => `${nodeNumberToType(type)}[${id}]`
