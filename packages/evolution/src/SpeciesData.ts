import type {
  ConfigData,
  ConfigOptions,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-js/core'

import type { OrganismFactoryOptions } from './OrganismFactoryOptions.js'
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
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>
> {
  genome: GFO
  organismState: OrganismFactoryOptions
}

export interface SpeciesData<
  NCO extends ConfigOptions,
  LCO extends ConfigOptions,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions
> {
  config: ConfigData<NCO, LCO> | null
  state: SD | null
  genomeOptions: GO | null
  speciesOptions: SpeciesOptions
  organisms: Array<SpeciesDataOrganism<HND, LD, GFO>>
  speciesState: SpeciesState
}
