import type { LinkConfig } from '../config/ExtendedConfig.js'
import type { NodeRef } from '../node/NodeRef.js'
import type { LinkState } from '../state/ExtendedState.js'

// FIXME: use tuple instead of object
export interface LinkRef {
  from: NodeRef
  to: NodeRef
}

// FIXME: use tuple instead of object
export interface LinkData<LC extends LinkConfig, LS extends LinkState>
  extends LinkRef {
  weight: number
  innovation: number
  config: LC
  state: LS
}
