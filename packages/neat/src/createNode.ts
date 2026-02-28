import type { NodeFactory, NodeFactoryOptions } from '@neat-evolution/core'

import type { NEATContext } from './NEATContext.js'
import { NEATNode } from './NEATNode.js'

export const createNode: NodeFactory<NEATContext> = (
  factoryOptions: NodeFactoryOptions
): NEATNode => {
  return new NEATNode(factoryOptions)
}
