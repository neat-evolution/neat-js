import type { LinkConfig } from '../config/ExtendedConfig.js'
import type { NodeRef } from '../node/NodeRef.js'
import type { LinkState } from '../state/ExtendedState.js'

import type { LinkData } from './LinkData.js'
import type { LinkExtension } from './LinkExtension.js'

export type LinkFactoryOptions<
  LC extends LinkConfig,
  LS extends LinkState
> = Omit<LinkData<LC, LS>, 'config' | 'state'>

export type LinkFactory<
  LC extends LinkConfig,
  LS extends LinkState,
  L extends LinkExtension<LC, LS, L>
> = (
  from: NodeRef,
  to: NodeRef,
  weight: number,
  innovation: number,
  config: LC,
  state: LS
) => L
