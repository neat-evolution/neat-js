import type { NEATConfigOptions } from '../NEATConfigOptions.js'

import type { ConfigData } from './ConfigData.js'
import type { ConfigProvider } from './ConfigProvider.js'
import type { LinkConfig, NodeConfig } from './ExtendedConfig.js'

export class Config<NC extends NodeConfig, LC extends LinkConfig>
  implements ConfigProvider<NC, LC>
{
  public readonly config: NEATConfigOptions
  public readonly nodeConfig: NC
  public readonly linkConfig: LC

  constructor(
    configOptions: NEATConfigOptions,
    nodeConfig: NC,
    linkConfig: LC
  ) {
    this.config = configOptions
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
