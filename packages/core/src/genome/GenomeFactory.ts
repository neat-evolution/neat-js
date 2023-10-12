import type { ConfigOptions } from '../config/ConfigOptions.js'
import type { ConfigProvider } from '../config/ConfigProvider.js'
import type { StateData } from '../state/StateData.js'
import type { ExtendedState, StateProvider } from '../state/StateProvider.js'

import type { Genome } from './Genome.js'
import type { GenomeFactoryOptions } from './GenomeFactoryOptions.js'
import type { GenomeOptions } from './GenomeOptions.js'
import type { InitConfig } from './InitConfig.js'

export type GenomeFactory<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  C extends ConfigProvider<NCO, LCO>,
  NSD,
  LSD,
  NS extends ExtendedState<NSD>,
  LS extends ExtendedState<LSD>,
  SD extends StateData,
  S extends StateProvider<NSD, LSD, NS, LS, SD>,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions,
  G extends Genome<
    NCO,
    LCO,
    C,
    NSD,
    LSD,
    NS,
    LS,
    SD,
    S,
    HND,
    LD,
    GFO,
    GO,
    any,
    G
  >
> = (
  configProvider: C,
  stateProvider: S,
  genomeOptions: GO,
  initConfig: InitConfig,
  genomeFactoryOptions?: GFO
) => G
