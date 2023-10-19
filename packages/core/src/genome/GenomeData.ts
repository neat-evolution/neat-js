import type { ConfigData } from '../config/ConfigData.js'
import type { StateData } from '../state/StateData.js'

import type { GenomeFactoryOptions } from './GenomeFactoryOptions.js'
import type { GenomeOptions } from './GenomeOptions.js'

export interface GenomeData<
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> {
  config: CD
  state: SD
  genomeOptions: GO
  factoryOptions: GFO
}
