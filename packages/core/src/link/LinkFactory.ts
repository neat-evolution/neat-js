import type { LinkConfig } from '../config/ExtendedConfig.js'
import type { NodeKey } from '../node/nodeRefToKey.js'
import type { LinkState } from '../state/ExtendedState.js'

import type { LinkExtension } from './LinkExtension.js'

export type LinkFactoryOptions = [
  from: NodeKey,
  to: NodeKey,
  weight: number,
  innovation: number
]

export type LinkFactory<
  LC extends LinkConfig,
  LS extends LinkState,
  L extends LinkExtension<LC, LS, L>
> = (
  from: NodeKey,
  to: NodeKey,
  weight: number,
  innovation: number,
  config: LC,
  state: LS
) => L
