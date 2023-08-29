import { type NodeType } from '@neat-js/core'
import type { NodeFactory } from '@neat-js/core'

import { NEATNode } from './NEATNode.js'

export const createNode: NodeFactory<null, null, NEATNode> = (
  type: NodeType,
  id: number
): NEATNode => {
  return new NEATNode(type, id)
}
