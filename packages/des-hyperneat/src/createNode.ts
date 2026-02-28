import type { NEATConfigOptions, NodeFactory } from '@neat-evolution/core'

import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import {
  type DESHyperNEATGenomeOptions,
  defaultDESHyperNEATGenomeOptions,
} from './DESHyperNEATGenomeOptions.js'
import { DESHyperNEATNode } from './DESHyperNEATNode.js'
import type { DESHyperNEATNodeFactoryOptions } from './DESHyperNEATNodeFactoryOptions.js'

export type DESHyperNEATNodeFactory = NodeFactory<DESHyperNEATContext>

export const createNodeFactory =
  (options: DESHyperNEATGenomeOptions): DESHyperNEATNodeFactory =>
  (
    factoryOptions: DESHyperNEATNodeFactoryOptions,
    config: NEATConfigOptions,
    state: DESHyperNEATContext['State']['Node']
  ): DESHyperNEATNode => {
    return new DESHyperNEATNode(
      options,
      factoryOptions,
      config,
      state,
      createNodeFactory(options)
    )
  }

/**
 * @deprecated Use `createNodeFactory` instead.
 */
export const createNode = createNodeFactory(defaultDESHyperNEATGenomeOptions)
