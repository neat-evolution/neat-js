import type {
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-js/core'

import type { PopulationFactoryOptions } from './PopulationFactoryOptions.js'
import type { PopulationOptions } from './PopulationOptions.js'

export interface PopulationData<
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> {
  // shared state
  config: CD
  genomeOptions: GO

  // population state
  algorithmName: string
  populationOptions: PopulationOptions

  // population factory
  factoryOptions: PopulationFactoryOptions<CD, SD, HND, LD, GFO, GO>
}
