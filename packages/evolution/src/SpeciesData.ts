import type {
  ConfigData,
  Genome,
  GenomeData,
  GenomeOptions,
  StateData,
} from '@neat-js/core'

import type { OrganismState } from './OrganismData.js'
import type { SpeciesOptions } from './SpeciesOptions.js'

export interface SpeciesState {
  currentAge: number
  bestFitness: number
  lifetimeBestFitness: number
  lastImprovement: number
  offsprings: number
  elites: number
  extinct: boolean
  /**  When locked new organisms may be added, but the len() and iter() functions will remain unchanged after addition */
  locked: boolean
  /**  The number of organisms when species was locked */
  lockedOrganisms: number
}

export interface SpeciesDataOrganism<
  GO extends GenomeOptions,
  GD extends GenomeData<GO, G>,
  G extends Genome<any, any, any, any, GO, any, GD, G>
> {
  genome: Omit<GD, 'config' | 'state' | 'genomeOptions'>
  organismState: OrganismState
}

export interface SpeciesData<
  GO extends GenomeOptions,
  GD extends GenomeData<GO, G>,
  G extends Genome<any, any, any, any, GO, any, GD, G>
> {
  // shared state for all genomes
  config: ConfigData<any, any> | null
  state: StateData<any, any> | null
  genomeOptions: G['genomeOptions'] | null

  organisms: Array<SpeciesDataOrganism<GO, GD, G>>
  speciesOptions: SpeciesOptions
  speciesState: SpeciesState
}
