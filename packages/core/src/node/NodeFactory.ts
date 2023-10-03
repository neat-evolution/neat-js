import type { NodeConfig } from '../config/ExtendedConfig.js'
import type { NodeState } from '../state/ExtendedState.js'

import type { NodeExtension } from './NodeExtension.js'
import type { NodeRefTuple } from './NodeRef.js'
import type { NodeType } from './NodeType.js'

export type NodeFactoryOptions = NodeRefTuple

export type NodeFactory<
  NC extends NodeConfig,
  NS extends NodeState,
  N extends NodeExtension<NC, NS, N>
> = (type: NodeType, id: number, config: NC, state: NS) => N
