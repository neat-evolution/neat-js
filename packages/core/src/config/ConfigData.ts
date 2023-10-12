import type { NEATConfigOptions } from '../NEATConfigOptions.js'

import type { ConfigOptions } from './ConfigOptions.js'

export interface ConfigData<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions
> {
  neat: NEATConfigOptions
  node: NCO
  link: LCO
}
