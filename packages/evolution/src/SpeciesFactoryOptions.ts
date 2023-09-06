import type { Genome } from '@neat-js/core'

import type { Organism } from './Organism.js'
import type { SpeciesState } from './SpeciesData.js'

export interface SpeciesFactoryOptions<
  G extends Genome<any, any, any, any, any, any, any, G>
> {
  organisms: Array<Organism<G>>
  speciesState: SpeciesState
}
