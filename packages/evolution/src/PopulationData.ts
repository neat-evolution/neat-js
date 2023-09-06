import type {
  ConfigData,
  Genome,
  GenomeData,
  GenomeOptions,
  StateData,
} from '@neat-js/core'

import type { PopulationOptions } from './PopulationOptions.js'
import type { Species } from './Species.js'
import type { SpeciesData } from './SpeciesData.js'

export type PopulationDataSpecies<
  GO extends GenomeOptions,
  GD extends GenomeData<GO, G>,
  G extends Genome<any, any, any, any, GO, any, GD, G>
> = Omit<
  SpeciesData<GO, GD, G>,
  'config' | 'state' | 'genomeOptions' | 'speciesOptions'
>

export type PopulationDataSpeciesEntry<
  GO extends GenomeOptions,
  GD extends GenomeData<GO, G>,
  G extends Genome<any, any, any, any, GO, any, GD, G>
> = [speciesId: number, speciesData: PopulationDataSpecies<GO, GD, G>]

export interface PopulationData<
  GO extends GenomeOptions,
  GD extends GenomeData<GO, G>,
  G extends Genome<any, any, any, any, GO, any, GD, G>
> {
  // shared state
  config: ConfigData<any, any>
  /** created by the population */
  state: StateData<any, any>
  genomeOptions: G['genomeOptions']

  // population state
  algorithmName: string
  populationOptions: PopulationOptions
  nextId: number

  // population factory
  species: Array<PopulationDataSpeciesEntry<GO, GD, G>>
  extinctSpecies: Array<PopulationDataSpeciesEntry<GO, GD, G>>
}

export const toPopulationDataSpecies = <
  GO extends GenomeOptions,
  GD extends GenomeData<GO, G>,
  G extends Genome<any, any, any, any, GO, any, GD, G>
>(
  species: Species<GO, GD, G>
): PopulationDataSpecies<GO, GD, G> => {
  const data = species.toJSON()
  return {
    organisms: data.organisms,
    speciesState: data.speciesState,
  }
}
