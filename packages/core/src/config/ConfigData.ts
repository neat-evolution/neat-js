import type { NEATConfigOptions } from '../NEATConfigOptions.js'

import type { LinkConfig, NodeConfig } from './ExtendedConfig.js'

export interface ConfigData<NC extends NodeConfig, LC extends LinkConfig> {
  neat: NEATConfigOptions
  // FIXME: this needs to be NCO and LCO (maybe?)
  node: NC
  link: LC
}
