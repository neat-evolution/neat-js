import { CoreConfig, type NEATConfigOptions } from '@neat-evolution/core'

import type { DESHyperNEATConfigData } from './DESHyperNEATConfigData.js'
import type { DESHyperNEATConfigFactoryOptions } from './DESHyperNEATConfigFactoryOptions.js'

export class DESHyperNEATConfig extends CoreConfig<
  DESHyperNEATConfigFactoryOptions,
  NEATConfigOptions,
  NEATConfigOptions,
  DESHyperNEATConfigData
> {
  public readonly cppn: NEATConfigOptions

  constructor(factoryOptions: DESHyperNEATConfigFactoryOptions) {
    super(factoryOptions)
    this.cppn = factoryOptions.cppn
  }

  override node() {
    return this.cppn
  }

  override link() {
    return this.cppn
  }

  override toJSON() {
    return {
      cppn: this.cppn,
      neat: this.neatConfig,
    }
  }
}
