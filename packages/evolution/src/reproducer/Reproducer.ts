import type { Genome } from '@neat-js/core'

import type { Organism } from '../Organism.js'

export interface Reproducer<
  G extends Genome<any, any, any, any, any, any, any, G>
> {
  copyElites: (speciesIds: number[]) => Promise<Array<Organism<G>>>
  reproduce: (speciesIds: number[]) => Promise<Array<Organism<G>>>
}
