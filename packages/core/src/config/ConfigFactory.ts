import type { NEATConfigOptions } from '../NEATConfigOptions.js'

import type { ConfigOptions } from './ConfigOptions.js'
import type { ConfigProvider } from './ConfigProvider.js'

export type ConfigFactory<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  C extends ConfigProvider<NCO, LCO>
> = (
  neatConfigOptions: NEATConfigOptions,
  nodeConfigOptions: NCO,
  linkConfigOptions: LCO
) => C
