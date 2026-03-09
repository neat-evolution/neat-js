import type { ConfigFactory } from '@neat-evolution/core'
import { DESHyperNEATConfig } from './DESHyperNEATConfig.js'
import type { DESHyperNEATConfigFactoryOptions } from './DESHyperNEATConfigFactoryOptions.js'
import type { DESHyperNEATContext } from './DESHyperNEATContext.js'

export const createConfig: ConfigFactory<DESHyperNEATContext> = (
  factoryOptions: DESHyperNEATConfigFactoryOptions
) => {
  return new DESHyperNEATConfig(factoryOptions)
}
