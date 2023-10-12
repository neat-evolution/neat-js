import type {
  ConfigData,
  ConfigOptions,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-js/core'

import type { PopulationFactoryOptions } from './PopulationFactoryOptions.js'
import type { PopulationOptions } from './PopulationOptions.js'

export interface PopulationData<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> {
  // shared state
  config: ConfigData<any, any>
  genomeOptions: GO

  // population state
  algorithmName: string
  populationOptions: PopulationOptions

  // population factory
  factoryOptions: PopulationFactoryOptions<NCO, LCO, SD, HND, LD, GFO, GO>
}
