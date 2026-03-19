import type { NodeFactory, NodeTypeOf } from '@neat-evolution/core'

import type { CPPNContext } from './CPPNContext.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'
import { CPPNNode } from './CPPNNode.js'
import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'
import {
  type CPPNNodeOptions,
  defaultCPPNNodeOptions,
} from './CPPNNodeOptions.js'

export const createNodeFactory = <GO extends CPPNGenomeOptions>(
  nodeOptions: CPPNNodeOptions
) => {
  const createNode: NodeFactory<CPPNContext<GO>> = (
    factoryOptions: CPPNNodeFactoryOptions
  ): NodeTypeOf<CPPNContext<GO>> => {
    return CPPNNode.from(factoryOptions, nodeOptions) as NodeTypeOf<
      CPPNContext<GO>
    >
  }
  return createNode
}

export const createNode: NodeFactory<CPPNContext> = (
  factoryOptions: CPPNNodeFactoryOptions
): CPPNNode => {
  return CPPNNode.from(factoryOptions, defaultCPPNNodeOptions)
}
