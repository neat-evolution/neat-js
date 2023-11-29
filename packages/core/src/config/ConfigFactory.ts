import type { ConfigData } from './ConfigData.js'
import type { ConfigFactoryOptions } from './ConfigFactoryOptions.js'
import type { ConfigOptions } from './ConfigOptions.js'
import type { ConfigProvider } from './ConfigProvider.js'

export type ConfigFactory<
  CFO extends ConfigFactoryOptions,
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  CD extends ConfigData,
  C extends ConfigProvider<NCO, LCO, CD>,
> = (factoryOptions: CFO) => C
