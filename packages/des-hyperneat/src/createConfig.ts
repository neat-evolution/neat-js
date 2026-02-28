import type { ConfigFactory } from '@neat-evolution/core'

import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import { DESHyperNEATConfig } from './DESHyperNEATConfig.js'
import type { DESHyperNEATConfigFactoryOptions } from './DESHyperNEATConfigFactoryOptions.js'

export const createConfig: ConfigFactory<DESHyperNEATContext> = (
  factoryOptions: DESHyperNEATConfigFactoryOptions
) => {
  return new DESHyperNEATConfig(factoryOptions)
}
