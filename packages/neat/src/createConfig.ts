import type {
  ConfigData,
  ConfigFactory,
  ConfigFactoryOptions,
} from '@neat-js/core'

import { NEATConfig } from './NEATConfig.js'

export const createConfig: ConfigFactory<
  ConfigFactoryOptions,
  null,
  null,
  ConfigData,
  NEATConfig
> = (factoryOptions: ConfigFactoryOptions) => {
  return new NEATConfig(factoryOptions)
}
