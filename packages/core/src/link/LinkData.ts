import type { LinkConfig } from '../config/ExtendedConfig.js'
import type { NodeKey } from '../node/nodeRefToKey.js'
import type { LinkState } from '../state/ExtendedState.js'

export interface LinkRef {
  from: NodeKey
  to: NodeKey
}

export interface LinkData<LC extends LinkConfig, LS extends LinkState>
  extends LinkRef {
  weight: number
  innovation: number
  config: LC
  state: LS
}
