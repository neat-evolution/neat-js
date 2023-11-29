import type { ConfigOptions } from '../config/ConfigOptions.js'
import type { ConfigProvider } from '../config/ConfigProvider.js'
import type { ConfigData } from '../index.js'
import type { StateData } from '../state/StateData.js'
import type { ExtendedState, StateProvider } from '../state/StateProvider.js'

import type { GenomeData } from './GenomeData.js'
import type { GenomeFactoryOptions } from './GenomeFactoryOptions.js'
import { type GenomeOptions } from './GenomeOptions.js'

export interface Genome<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  CD extends ConfigData,
  C extends ConfigProvider<NCO, LCO, CD>,
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
  GD extends GenomeData<CD, SD, HND, LD, GFO, GO>,
  G extends Genome<
    NCO,
    LCO,
    CD,
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
    GD,
    G
  >,
> {
  readonly config: C
  readonly state: S
  readonly genomeOptions: GO

  clone: () => G
  crossover: (other: G, fitness: number, otherFitness: number) => G
  mutate: () => Promise<void>
  distance: (other: G) => number
  toJSON: () => GD
  toFactoryOptions: () => GFO
}
