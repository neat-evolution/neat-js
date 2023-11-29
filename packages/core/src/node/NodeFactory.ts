import type { ConfigOptions } from '../config/ConfigOptions.js'
import type { ExtendedState } from '../state/StateProvider.js'

import type { Node } from './Node.js'
import type { NodeFactoryOptions } from './NodeFactoryOptions.js'

export interface NodeFactory<
  NFO extends NodeFactoryOptions,
  NCO extends ConfigOptions,
  NSD,
  NS extends ExtendedState<NSD>,
  N extends Node<NFO, NCO, NSD, NS, N>,
> {
  (factoryOptions: NodeFactoryOptions, config: NCO, state: NS): N
  (factoryOptions: NodeFactoryOptions & Partial<NFO>, config: NCO, state: NS): N
}
