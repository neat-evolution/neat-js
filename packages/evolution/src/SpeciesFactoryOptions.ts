import type {
  ConfigData,
  Genome,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-evolution/core'

import type { Organism } from './Organism.js'
import type { SpeciesState } from './SpeciesData.js'

export interface SpeciesFactoryOptions<
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions,
  G extends Genome<
    any,
    any,
    CD,
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
  >,
> {
  organisms: Array<Organism<CD, SD, HND, LD, GFO, GO, G>>
  speciesState: SpeciesState
}
