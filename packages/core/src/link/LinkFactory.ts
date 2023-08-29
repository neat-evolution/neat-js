import type { LinkConfig } from '../config/ExtendedConfig.js'
import type { NodeRef } from '../node/Node.js'
import type { LinkState } from '../state/ExtendedState.js'

import type { LinkExtension } from './Link.js'

export type LinkFactory<
  C extends LinkConfig,
  S extends LinkState,
  L extends LinkExtension<C, S, L>
> = (
  from: NodeRef,
  to: NodeRef,
  weight: number,
  innovation: number,
  config: C,
  state: S
) => L
