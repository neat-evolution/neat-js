import type { NEATOptions } from '../NEATOptions.js'

import type { ConfigProvider } from './ConfigProvider.js'
import type { LinkConfig, NodeConfig } from './ExtendedConfig.js'

export type ConfigFactoryWithNull<
  NC extends null,
  LC extends null,
  C extends ConfigProvider<NC, LC>
> = (options: NEATOptions) => C

export type ConfigFactoryWithNonNull<
  NC extends NodeConfig,
  LC extends LinkConfig,
  C extends ConfigProvider<NC, LC>
> = (options: NEATOptions, nodeConfig: NC, linkConfig: LC) => C

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
