import type {
  ConfigFactoryOptions,
  NEATConfigOptions,
} from '@neat-evolution/core'

export interface DESHyperNEATConfigFactoryOptions extends ConfigFactoryOptions {
  cppn: NEATConfigOptions
}
