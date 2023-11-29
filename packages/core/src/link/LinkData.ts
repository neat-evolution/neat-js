import type { ConfigOptions } from '../config/ConfigOptions.js'

import type { LinkFactoryOptions } from './LinkFactoryOptions.js'

export interface LinkData<
  LFO extends LinkFactoryOptions,
  LCO extends ConfigOptions,
  LSD,
> {
  config: LCO
  state: LSD
  factoryOptions: LFO
}
