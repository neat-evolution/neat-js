import type { NEATConfigOptions } from '../NEATConfigOptions.js'

import type { ConfigData } from './ConfigData.js'
import type { LinkConfig, NodeConfig } from './ExtendedConfig.js'

export interface ConfigProvider<NC extends NodeConfig, LC extends LinkConfig> {
  readonly config: NEATConfigOptions
  readonly nodeConfig: NC
  readonly linkConfig: LC

  neat: () => NEATConfigOptions
  node: () => NC
  link: () => LC
  // FIXME: this should return CD instead of ConfigData<NC, LC>
  toJSON: () => ConfigData<NC, LC>
}
