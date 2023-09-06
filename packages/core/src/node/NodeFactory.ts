import type { NodeConfig } from '../config/ExtendedConfig.js'
import type { NodeState } from '../state/ExtendedState.js'

import type { NodeData, NodeType } from './NodeData.js'
import type { NodeExtension } from './NodeExtension.js'

export type NodeFactoryOptions<
  NC extends NodeConfig,
  NS extends NodeState
> = Omit<NodeData<NC, NS>, 'config' | 'state'>

export type NodeFactory<
  NC extends NodeConfig,
  NS extends NodeState,
  N extends NodeExtension<NC, NS, N>
> = (type: NodeType, id: number, config: NC, state: NS) => N
