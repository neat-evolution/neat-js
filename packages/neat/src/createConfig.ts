import { NEATConfig } from '@neat-js/core'
import type { ConfigFactory, NEATOptions } from '@neat-js/core'

export const createConfig: ConfigFactory<null, null, NEATConfig> = (
  options: NEATOptions
) => {
  return new NEATConfig(options)
}
