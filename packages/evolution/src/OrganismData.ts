import type {
  ConfigData,
  GenomeData,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-js/core'

import type { OrganismFactoryOptions } from './OrganismFactoryOptions.js'

export interface OrganismData<
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> {
  genome: GenomeData<CD, SD, HND, LD, GFO, GO>
  organismState: OrganismFactoryOptions
}
