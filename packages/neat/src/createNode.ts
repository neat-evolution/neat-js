import { type NodeFactory, type NodeFactoryOptions } from '@neat-evolution/core'

import { NEATNode } from './NEATNode.js'

export const createNode: NodeFactory<
  NodeFactoryOptions,
  null,
  null,
  null,
  NEATNode
> = (factoryOptions: NodeFactoryOptions): NEATNode => {
  return new NEATNode(factoryOptions)
}
