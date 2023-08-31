import type { Environment } from '@neat-js/environment'
import type { Phenotype } from '@neat-js/phenotype'

// FIXME: where should this live?
export interface PhenotypeStats {
  nodes: number
  edges: number
}

export type PhenotypeData = [
  speciesIndex: number,
  genomeIndex: number,
  phenotype: Phenotype
]

export type FitnessData = [
  speciesIndex: number,
  organismIndex: number,
  fitness: number
]

export interface Evaluator {
  environment: Environment
  evaluate: (
    organismData: Iterable<PhenotypeData>
  ) => AsyncIterable<FitnessData>
}
