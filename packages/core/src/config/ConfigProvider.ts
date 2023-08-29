import type { NEATOptions } from '../NEATOptions.js'

import type { ConfigData } from './ConfigData.js'
import type { LinkConfig, NodeConfig } from './ExtendedConfig.js'

export interface ConfigProvider<NC extends NodeConfig, LC extends LinkConfig> {
  readonly config: NEATOptions
  readonly nodeConfig: NC
  readonly linkConfig: LC

  neat: () => NEATOptions
  node: () => NC
  link: () => LC
  // FIXME: this should return CD instead of ConfigData<NC, LC>
  toJSON: () => ConfigData<NC, LC>
}
