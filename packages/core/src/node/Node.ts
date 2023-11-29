import type { ConfigOptions } from '../config/ConfigOptions.js'
import type { ExtendedState } from '../state/StateProvider.js'

import type { NodeData } from './NodeData.js'
import type { NodeFactory } from './NodeFactory.js'
import type { NodeFactoryOptions } from './NodeFactoryOptions.js'
import type { NodeRef } from './NodeRef.js'

export interface Node<
  NFO extends NodeFactoryOptions,
  NCO extends ConfigOptions,
  NSD,
  NS extends ExtendedState<NSD>,
  N extends Node<NFO, NCO, NSD, NS, N>,
> extends NodeRef {
  // NodeExtension
  config: NCO
  state: NS

  // NodeFactory
  createNode: NodeFactory<NFO, NCO, NSD, NS, N>

  crossover: (other: N, fitness: number, otherFitness: number) => N
  distance: (other: N) => number
  toJSON: () => NodeData<NFO, NCO, NSD>
  toFactoryOptions: () => NFO
}
