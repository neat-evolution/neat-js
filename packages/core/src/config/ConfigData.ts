import type { NEATOptions } from '../NEATOptions.js'

import type { LinkConfig, NodeConfig } from './ExtendedConfig.js'

export interface ConfigData<NC extends NodeConfig, LC extends LinkConfig> {
  neat: NEATOptions
  node: NC
  link: LC
}
