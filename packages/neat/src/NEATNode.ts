import { CoreNode, type NodeFactoryOptions } from '@neat-js/core'

import { createNode } from './createNode.js'

export class NEATNode extends CoreNode<
  NodeFactoryOptions,
  null,
  null,
  null,
  NEATNode
> {
  constructor(factoryOptions: NodeFactoryOptions) {
    super(factoryOptions, null, null, createNode)
  }
}
