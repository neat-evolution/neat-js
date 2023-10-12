import type { ConfigData } from '../config/ConfigData.js'
import type { ConfigOptions } from '../config/ConfigOptions.js'
import type { StateData } from '../state/StateData.js'

import type { GenomeFactoryOptions } from './GenomeFactoryOptions.js'
import type { GenomeOptions } from './GenomeOptions.js'

export interface GenomeData<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> {
  config: ConfigData<NCO, LCO>
  state: SD
  genomeOptions: GO
  factoryOptions: GFO
}
