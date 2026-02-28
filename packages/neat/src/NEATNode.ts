import { CoreNode, type NodeFactoryOptions } from '@neat-evolution/core'

import type { NEATContext } from './NEATContext.js'
import { createNode } from './createNode.js'

export class NEATNode extends CoreNode<NEATContext> {
  constructor(factoryOptions: NodeFactoryOptions) {
    super(factoryOptions, null, null, createNode)
  }
}
