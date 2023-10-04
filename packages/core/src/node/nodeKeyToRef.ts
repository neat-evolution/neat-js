import type { NodeRef, NodeRefTuple } from './NodeRef.js'
import type { NodeType } from './NodeType.js'
import { nodeTypeToNumber, nodeNumberToType } from './nodeTypeToNumber.js'

/**
 * @param {string} key a node key in the form of `${type}[${id}]`
 * @returns {NodeRef} a node ref
 */
export const nodeKeyToRef = (key: string): NodeRef => {
  const [type, id] = key.split('[') as [type: string, id: string]
  return {
    type: type as NodeType,
    id: Number(id.slice(0, -1)),
  }
}

export const nodeKeyToRefTuple = (key: string): NodeRefTuple => {
  const [type, id] = key.split('[') as [type: string, id: string]
  return [type as NodeType, Number(id.slice(0, -1))]
}

/**
 * Used in toSharedBuffer
 * @param {string} key  a node key in the form of `${type}[${id}]`
 * @returns {[type: number, id: number]} a tuple of node type and id
 */
export const nodeKeyToNumericTuple = (
  key: string
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
]): string => `${nodeNumberToType(type)}[${id}]`
