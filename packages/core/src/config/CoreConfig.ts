import type { NEATConfigOptions } from '../NEATConfigOptions.js'

import type { ConfigData } from './ConfigData.js'
import type { ConfigFactoryOptions } from './ConfigFactoryOptions.js'
import type { ConfigOptions } from './ConfigOptions.js'
import type { ConfigProvider } from './ConfigProvider.js'

export class CoreConfig<
  CFO extends ConfigFactoryOptions,
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  CD extends ConfigData
> implements ConfigProvider<NCO, LCO, CD>
{
  public readonly neatConfig: NEATConfigOptions

  constructor(factoryOptions: CFO) {
    this.neatConfig = factoryOptions.neat
  }

  neat() {
    return this.neatConfig
  }

  node(): NCO {
    throw new Error('Method not implemented.')
    // return this.nodeConfig
  }

  link(): LCO {
    throw new Error('Method not implemented.')
    // return this.linkConfig
  }

  toJSON(): CD {
    throw new Error('Method not implemented.')
    // return { neat: this.neatConfig }
  }
}
