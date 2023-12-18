import { type NodeType } from './NodeType.js'

export type NodeId = number | string

export interface NodeRef {
  type: NodeType
  id: NodeId
}

export type NodeRefTuple = [type: NodeType, id: NodeId]
