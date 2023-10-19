import type { ConfigFactory, NEATConfigOptions } from '@neat-js/core'

import { DESHyperNEATConfig } from './DESHyperNEATConfig.js'
import type { DESHyperNEATConfigData } from './DESHyperNEATConfigData.js'
import type { DESHyperNEATConfigFactoryOptions } from './DESHyperNEATConfigFactoryOptions.js'

export const createConfig: ConfigFactory<
  DESHyperNEATConfigFactoryOptions,
  NEATConfigOptions,
  NEATConfigOptions,
  DESHyperNEATConfigData,
  DESHyperNEATConfig
> = (factoryOptions: DESHyperNEATConfigFactoryOptions) => {
  return new DESHyperNEATConfig(factoryOptions)
}
