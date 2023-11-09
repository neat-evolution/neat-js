import { type NodeFactory } from '@neat-evolution/core'

import { CPPNNode } from './CPPNNode.js'
import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'
import {
  defaultCPPNNodeOptions,
  type CPPNNodeOptions,
} from './CPPNNodeOptions.js'

export const createNodeFactory = (nodeOptions: CPPNNodeOptions) => {
  const createNode: NodeFactory<
    CPPNNodeFactoryOptions,
    null,
    null,
    null,
    CPPNNode
  > = (factoryOptions: CPPNNodeFactoryOptions): CPPNNode => {
    return new CPPNNode(factoryOptions, nodeOptions)
  }
  return createNode
}

export const createNode: NodeFactory<
  CPPNNodeFactoryOptions,
  null,
  null,
  null,
  CPPNNode
> = (factoryOptions: CPPNNodeFactoryOptions): CPPNNode => {
  return new CPPNNode(factoryOptions, defaultCPPNNodeOptions)
}
