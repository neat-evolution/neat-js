import type { Genome } from '@neat-evolution/core'
import type { RNG } from '@neat-evolution/utils'

import type { Organism } from '../Organism.js'

export interface Reproducer {
  copyElites: (
    speciesIds: number[]
  ) => Promise<Array<Organism & { genome: Genome }>>
  reproduce: (
    speciesIds: number[],
    rng: RNG
  ) => Promise<Array<Organism & { genome: Genome }>>
}
