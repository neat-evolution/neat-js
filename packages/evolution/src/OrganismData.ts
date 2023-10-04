import type { Genome, GenomeData, InitConfig } from '@neat-js/core'

export interface OrganismState {
  fitness: number | null
  adjustedFitness: number | null
  generation: number
}

export interface OrganismData<
  GO extends InitConfig,
  G extends Genome<any, any, any, any, GO, any, any, G>
> {
  genome: GenomeData<GO, G>
  organismState: OrganismState
}
