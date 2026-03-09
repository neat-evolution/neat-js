import { CoreNode, type NodeFactoryOptions } from '@neat-evolution/core'
import { createNode } from './createNode.js'
import type { NEATContext } from './NEATContext.js'

export class NEATNode extends CoreNode<NEATContext> {
  constructor(factoryOptions: NodeFactoryOptions) {
    super(factoryOptions, null, null, createNode)
  }
}
