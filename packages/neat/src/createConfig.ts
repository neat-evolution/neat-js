import type { ConfigFactory, NEATConfigOptions } from '@neat-js/core'

import { NEATConfig } from './NEATConfig.js'

export const createConfig: ConfigFactory<null, null, NEATConfig> = (
  neatConfigOptions: NEATConfigOptions
) => {
  return new NEATConfig(neatConfigOptions, null, null)
}
