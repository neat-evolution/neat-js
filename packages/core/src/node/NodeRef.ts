import { type NodeType } from './NodeType.js'

export interface NodeRef {
  type: NodeType
  id: number | string
}

export type NodeRefTuple = [type: NodeType, id: number]
