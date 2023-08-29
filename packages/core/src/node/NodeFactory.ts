import type { NodeConfig } from '../config/ExtendedConfig.js'
import type { NodeState } from '../state/ExtendedState.js'

import type { NodeExtension, NodeType } from './Node.js'

export type NodeFactory<
  C extends NodeConfig,
  S extends NodeState,
  N extends NodeExtension<C, S, N>
> = (type: NodeType, id: number, config: C, state: S) => N
