import type {
  ConfigOptions,
  Genome,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-js/core'

import type { Species } from './Species.js'
import type { SpeciesData } from './SpeciesData.js'

export type PopulationDataSpecies<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> = Omit<
  SpeciesData<NCO, LCO, SD, HND, LD, GFO, GO>,
  'config' | 'state' | 'genomeOptions' | 'speciesOptions'
>

export type PopulationDataSpeciesEntry<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> = [
  speciesKey: number,
  speciesValue: PopulationDataSpecies<NCO, LCO, SD, HND, LD, GFO, GO>
]

export interface PopulationFactoryOptions<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> {
  state: SD
  nextId: number
  species: Array<PopulationDataSpeciesEntry<NCO, LCO, SD, HND, LD, GFO, GO>>
  extinctSpecies: Array<
    PopulationDataSpeciesEntry<NCO, LCO, SD, HND, LD, GFO, GO>
  >
}

export const toPopulationDataSpecies = <
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
>(
  species: Species<NCO, LCO, SD, HND, LD, GFO, GO, G>
): PopulationDataSpecies<NCO, LCO, SD, HND, LD, GFO, GO> => {
  const data = species.toJSON()
  return {
    organisms: data.organisms,
    speciesState: data.speciesState,
  }
}
