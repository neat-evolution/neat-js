import type { NEATConfigOptions } from '../NEATConfigOptions.js'

import type { ConfigProvider } from './ConfigProvider.js'
import type { LinkConfig, NodeConfig } from './ExtendedConfig.js'

export type ConfigFactoryWithNull<
  NC extends null,
  LC extends null,
  C extends ConfigProvider<NC, LC>
> = (options: NEATConfigOptions) => C

// FIXME: nodeConfig and linkConfig need to be NCO and LCO respectively (maybe?)
export type ConfigFactoryWithNonNull<
  NC extends NodeConfig,
  LC extends LinkConfig,
  C extends ConfigProvider<NC, LC>
> = (options: NEATConfigOptions, nodeConfig: NC, linkConfig: LC) => C

export type ConfigFactory<
  NC extends NodeConfig,
  LC extends LinkConfig,
  C extends ConfigProvider<NC, LC>
> = NC extends null
  ? LC extends null
    ? ConfigFactoryWithNull<NC, LC, C>
    : never
  : LC extends null
  ? never
  : ConfigFactoryWithNonNull<NC, LC, C>
