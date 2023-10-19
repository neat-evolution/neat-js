import type {
  ConfigData,
  Genome,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-js/core'

import type { Species } from './Species.js'
import type { SpeciesData } from './SpeciesData.js'

export type PopulationDataSpecies<
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> = Omit<
  SpeciesData<CD, SD, HND, LD, GFO, GO>,
  'config' | 'state' | 'genomeOptions' | 'speciesOptions'
>

export type PopulationDataSpeciesEntry<
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> = [
  speciesKey: number,
  speciesValue: PopulationDataSpecies<CD, SD, HND, LD, GFO, GO>
]

export interface PopulationFactoryOptions<
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> {
  state: SD
  nextId: number
  species: Array<PopulationDataSpeciesEntry<CD, SD, HND, LD, GFO, GO>>
  extinctSpecies: Array<PopulationDataSpeciesEntry<CD, SD, HND, LD, GFO, GO>>
}

export const toPopulationDataSpecies = <
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
  >
>(
  species: Species<CD, SD, HND, LD, GFO, GO, G>
): PopulationDataSpecies<CD, SD, HND, LD, GFO, GO> => {
  const data = species.toJSON()
  return {
    organisms: data.organisms,
    speciesState: data.speciesState,
  }
}
