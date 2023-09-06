import type { Genome, GenomeData } from '@neat-js/core'

export interface OrganismState {
  fitness: number | null
  adjustedFitness: number | null
  generation: number
}

// FIXME: Add OrganismFactoryOptions
export interface OrganismData<
  G extends Genome<any, any, any, any, any, any, any, G>
> {
  genome: GenomeData<any, G>
  organismState: OrganismState
}
