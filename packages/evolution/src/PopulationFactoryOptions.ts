import type {
  AlgorithmContext,
  ConfigData,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-evolution/core'

import type { Species } from './Species.js'
import type { SpeciesData, SpeciesDataOrganism } from './SpeciesData.js'

export type PopulationDataSpecies<
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions,
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
  GO extends GenomeOptions,
> = [
  speciesKey: number,
  speciesValue: PopulationDataSpecies<CD, SD, HND, LD, GFO, GO>,
]

export interface PopulationFactoryOptions<
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions,
> {
  state: SD
  nextId: number
  species: Array<PopulationDataSpeciesEntry<CD, SD, HND, LD, GFO, GO>>
  extinctSpecies: Array<PopulationDataSpeciesEntry<CD, SD, HND, LD, GFO, GO>>
}

export const toPopulationDataSpecies = <
  Ctx extends AlgorithmContext,
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions,
>(
  species: Species<Ctx>
): PopulationDataSpecies<CD, SD, HND, LD, GFO, GO> => {
  const data = species.toJSON()
  return {
    organisms: data.organisms as Array<SpeciesDataOrganism<HND, LD, GFO>>,
    speciesState: data.speciesState,
  }
}
