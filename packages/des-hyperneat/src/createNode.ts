import { type NEATConfigOptions, type NodeFactory } from '@neat-evolution/core'

import type { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import {
  defaultDESHyperNEATGenomeOptions,
  type DESHyperNEATGenomeOptions,
} from './DESHyperNEATGenomeOptions.js'
import { DESHyperNEATNode } from './DESHyperNEATNode.js'
import type { DESHyperNEATNodeFactoryOptions } from './DESHyperNEATNodeFactoryOptions.js'

export type DESHyperNEATNodeFactory = NodeFactory<
  DESHyperNEATNodeFactoryOptions,
  NEATConfigOptions,
  CustomStateData,
  CustomState,
  DESHyperNEATNode
>

export const createNodeFactory =
  (options: DESHyperNEATGenomeOptions): DESHyperNEATNodeFactory =>
  (
    factoryOptions: DESHyperNEATNodeFactoryOptions,
    config: NEATConfigOptions,
    state: CustomState
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
