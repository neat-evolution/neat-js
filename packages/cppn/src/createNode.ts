import {
  Activation,
  type NodeFactory,
  NodeType,
  type NodeTypeOf,
} from '@neat-evolution/core'
import type { RNG } from '@neat-evolution/utils'

import type { CPPNContext } from './CPPNContext.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'
import { CPPNNode, pickActivation } from './CPPNNode.js'
import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'
import {
  type CPPNNodeOptions,
  defaultCPPNNodeOptions,
} from './CPPNNodeOptions.js'

function resolveActivation(
  factoryOptions: CPPNNodeFactoryOptions,
  nodeOptions: CPPNNodeOptions,
  rng?: RNG
): CPPNNodeFactoryOptions {
  if (factoryOptions.activation != null) {
    return factoryOptions
  }
  // Input nodes always get Activation.None — no RNG needed
  if (factoryOptions.type === NodeType.Input) {
    return { ...factoryOptions, activation: Activation.None }
  }
  if (rng == null) {
    throw new Error(
      'CPPN createNode requires rng when activation is not provided'
    )
  }
  return {
    ...factoryOptions,
    activation: pickActivation(factoryOptions.type, nodeOptions, rng),
  }
}

export const createNodeFactory = <GO extends CPPNGenomeOptions>(
  nodeOptions: CPPNNodeOptions
) => {
  const createNode: NodeFactory<CPPNContext<GO>> = (
    factoryOptions: CPPNNodeFactoryOptions,
    _config: unknown,
    _state: unknown,
    rng?: RNG
  ): NodeTypeOf<CPPNContext<GO>> => {
    return CPPNNode.from(
      resolveActivation(factoryOptions, nodeOptions, rng),
      nodeOptions
    ) as NodeTypeOf<CPPNContext<GO>>
  }
  return createNode
}

export const createNode: NodeFactory<CPPNContext> = (
  factoryOptions: CPPNNodeFactoryOptions,
  _config: unknown,
  _state: unknown,
  rng?: RNG
): CPPNNode => {
  return CPPNNode.from(
    resolveActivation(factoryOptions, defaultCPPNNodeOptions, rng),
    defaultCPPNNodeOptions
  )
}
