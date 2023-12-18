import type { NodeId } from './NodeRef.js'
import type { NodeType } from './NodeType.js'

// FIXME: use a tuple instead of an object
export interface NodeFactoryOptions {
  type: NodeType
  id: NodeId
}
