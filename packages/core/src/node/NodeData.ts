import type { NodeConfig } from '../config/ExtendedConfig.js'
import type { NodeState } from '../state/ExtendedState.js'

import { type NodeRef } from './NodeRef.js'

export interface NodeData<C extends NodeConfig, S extends NodeState>
  extends NodeRef {
  // FIXME: this should be NodeConfigData
  config: C

  // FIXME: this should be NodeStateData
  state: S
}
