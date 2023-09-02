import type { Environment } from '@neat-js/environment'
import type { PhenotypeData } from '@neat-js/phenotype'

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
