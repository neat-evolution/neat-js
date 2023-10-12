import type { NEATConfigOptions } from '../NEATConfigOptions.js'

import type { ConfigData } from './ConfigData.js'
import type { ConfigOptions } from './ConfigOptions.js'

export interface ConfigProvider<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions
> {
  neat: () => NEATConfigOptions
  node: () => NCO
  link: () => LCO
  toJSON: () => ConfigData<NCO, LCO>
}
