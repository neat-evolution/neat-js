import type { ConfigOptions } from '../config/ConfigOptions.js'
import type { ExtendedState } from '../state/StateProvider.js'

import type { Link } from './Link.js'
import type { LinkFactoryOptions } from './LinkFactoryOptions.js'

export interface LinkFactory<
  LFO extends LinkFactoryOptions,
  LCO extends ConfigOptions,
  LSD,
  LS extends ExtendedState<LSD>,
  L extends Link<LFO, LCO, LSD, LS, L>,
> {
  (factoryOptions: LinkFactoryOptions, config: LCO, state: LS): L
  (factoryOptions: LinkFactoryOptions & Partial<LFO>, config: LCO, state: LS): L
}
