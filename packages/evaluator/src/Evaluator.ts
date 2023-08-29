import type { Environment } from '@neat-js/environment'
import type { ExecutorFactory } from '@neat-js/executor'
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
  createExecutor: ExecutorFactory
  evaluate: (
    organismData: Iterable<PhenotypeData>
  ) => AsyncIterable<FitnessData>
}
