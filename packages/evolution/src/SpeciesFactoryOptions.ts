import type { AlgorithmContext } from '@neat-evolution/core'

import type { Organism } from './Organism.js'
import type { SpeciesState } from './SpeciesData.js'

export interface SpeciesFactoryOptions<Ctx extends AlgorithmContext> {
  organisms: Array<Organism<Ctx>>
  speciesState: SpeciesState
}
