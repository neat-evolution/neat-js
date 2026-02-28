import type { ConfigFactory } from '@neat-evolution/core'

import type { NEATContext } from './NEATContext.js'
import { NEATConfig } from './NEATConfig.js'

export const createConfig: ConfigFactory<NEATContext> = (factoryOptions) => {
  return new NEATConfig(factoryOptions)
}
