import type { LinkConfig } from '../config/ExtendedConfig.js'
import type { NodeRef } from '../node/NodeData.js'
import type { LinkState } from '../state/ExtendedState.js'

export interface LinkRef {
  from: NodeRef
  to: NodeRef
}

export interface LinkData<LC extends LinkConfig, LS extends LinkState>
  extends LinkRef {
  weight: number
  innovation: number
  config: LC
  state: LS
}
