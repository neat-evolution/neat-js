import { type NodeType } from './NodeType.js'

export interface NodeRef {
  type: NodeType
  id: number
}

export type NodeRefTuple = [type: NodeType, id: number]
