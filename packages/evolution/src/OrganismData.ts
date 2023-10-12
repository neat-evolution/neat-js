import type {
  ConfigOptions,
  GenomeData,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-js/core'

import type { OrganismFactoryOptions } from './OrganismFactoryOptions.js'

export interface OrganismData<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> {
  genome: GenomeData<NCO, LCO, SD, HND, LD, GFO, GO>
  organismState: OrganismFactoryOptions
}
