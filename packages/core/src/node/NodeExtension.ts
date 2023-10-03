import type { NodeConfig } from '../config/ExtendedConfig.js'
import type { NodeState } from '../state/ExtendedState.js'

import type { NodeData } from './NodeData.js'
import type { NodeFactory, NodeFactoryOptions } from './NodeFactory.js'
import type { NodeRef } from './NodeRef.js'

export interface NodeExtension<
  NC extends NodeConfig,
  NS extends NodeState,
  N extends NodeExtension<NC, NS, N>
> extends NodeRef {
  config: NC
  state: NS

  createNode: NodeFactory<NC, NS, N>

  /** only useful in des-hyperneat */
  neat: () => NodeExtension<NC, NS, N>

  crossover: (other: N, fitness: number, otherFitness: number) => N
  distance: (other: N) => number

  toJSON: () => NodeData<NC, NS>
  toFactoryOptions: () => NodeFactoryOptions
}
