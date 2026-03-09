import type { ConfigFactory } from '@neat-evolution/core'
import { NEATConfig } from './NEATConfig.js'
import type { NEATContext } from './NEATContext.js'

export const createConfig: ConfigFactory<NEATContext> = (factoryOptions) => {
  return new NEATConfig(factoryOptions)
}
