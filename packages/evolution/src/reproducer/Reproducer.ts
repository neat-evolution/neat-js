import type { Genome } from '@neat-evolution/core'

import type { Organism } from '../Organism.js'

export interface Reproducer {
  copyElites: (
    speciesIds: number[]
  ) => Promise<Array<Organism & { genome: Genome }>>
  reproduce: (
    speciesIds: number[]
  ) => Promise<Array<Organism & { genome: Genome }>>
}
