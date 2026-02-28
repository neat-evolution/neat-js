import type { Organism } from './Organism.js'
import type { SpeciesState } from './SpeciesData.js'

export interface SpeciesFactoryOptions {
  organisms: Array<Organism<any>>
  speciesState: SpeciesState
}
