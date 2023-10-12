import type { NEATConfigOptions } from '../NEATConfigOptions.js'

import type { ConfigData } from './ConfigData.js'
import type { ConfigOptions } from './ConfigOptions.js'
import type { ConfigProvider } from './ConfigProvider.js'

export class CoreConfig<NCO extends ConfigOptions, LCO extends ConfigOptions>
  implements ConfigProvider<NCO, LCO>
{
  public readonly neatConfig: NEATConfigOptions
  public readonly nodeConfig: NCO
  public readonly linkConfig: LCO

  constructor(
    configOptions: NEATConfigOptions,
    nodeConfig: NCO,
    linkConfig: LCO
  ) {
    this.neatConfig = configOptions
    this.nodeConfig = nodeConfig
    this.linkConfig = linkConfig
  }

  neat() {
    return this.neatConfig
  }

  node() {
    return this.nodeConfig
  }

  link() {
    return this.linkConfig
  }

  toJSON(): ConfigData<NCO, LCO> {
    return {
      neat: this.neatConfig,
      node: this.nodeConfig,
      link: this.linkConfig,
    }
  }
}
