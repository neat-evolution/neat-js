import type {
  ConfigOptions,
  Genome,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-js/core'

import type { Organism } from './Organism.js'
import type { SpeciesState } from './SpeciesData.js'

export interface SpeciesFactoryOptions<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions,
  G extends Genome<
    NCO,
    LCO,
    any,
    any,
    any,
    any,
    any,
    SD,
    any,
    HND,
    LD,
    GFO,
    GO,
    any,
    G
  >
> {
  organisms: Array<Organism<NCO, LCO, SD, HND, LD, GFO, GO, G>>
  speciesState: SpeciesState
}
