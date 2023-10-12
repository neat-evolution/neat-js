import type { NodeType } from './NodeType.js'

// FIXME: use a tuple instead of an object
export interface NodeFactoryOptions {
  type: NodeType
  id: number
}
