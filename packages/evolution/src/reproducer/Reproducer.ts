import type { Genome } from '@neat-evolution/core'

import type { Organism } from '../Organism.js'

export interface Reproducer {
  copyElites: (
    speciesIds: number[]
  ) => Promise<Array<Organism<any> & { genome: Genome<any> }>>
  reproduce: (
    speciesIds: number[]
  ) => Promise<Array<Organism<any> & { genome: Genome<any> }>>
}
