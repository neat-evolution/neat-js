import { defaultNEATConfigOptions, type NEATOptions } from '../NEATOptions.js'

import type { ConfigData } from './ConfigData.js'
import type { ConfigProvider } from './ConfigProvider.js'
import type { LinkConfig, NodeConfig } from './ExtendedConfig.js'

export class Config<NC extends NodeConfig, LC extends LinkConfig>
  implements ConfigProvider<NC, LC>
{
  public readonly config: NEATOptions
  public readonly nodeConfig: NC
  public readonly linkConfig: LC

  constructor(
    // FIXME: stop allowing partial config
    config: Partial<NEATOptions> = {},
    nodeConfig: NC,
    linkConfig: LC
  ) {
    // FIXME: remove this magic
    this.config = { ...defaultNEATConfigOptions, ...config }
    this.nodeConfig = nodeConfig
    this.linkConfig = linkConfig
  }

  neat() {
    return this.config
  }

  node() {
    return this.nodeConfig
  }

  link() {
    return this.linkConfig
  }

  toJSON(): ConfigData<NC, LC> {
    return {
      neat: this.config,
      node: this.nodeConfig,
      link: this.linkConfig,
    }
  }
}
