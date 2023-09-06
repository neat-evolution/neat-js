import type { NodeConfig } from '../config/ExtendedConfig.js'
import type { NodeState } from '../state/ExtendedState.js'

export enum NodeType {
  Input = 'Input',
  Hidden = 'Hidden',
  Output = 'Output',
}

export interface NodeRef {
  id: number
  type: NodeType
}

export interface NodeData<C extends NodeConfig, S extends NodeState>
  extends NodeRef {
  // FIXME: this should be NodeConfigData
  config: C

  // FIXME: this should be NodeStateData
  state: S
}
