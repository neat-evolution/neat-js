import type { Phenotype } from './Phenotype.js'

export type SerializedPhenotypeData = SharedArrayBuffer

export type PhenotypeData = [
  speciesIndex: number,
  genomeIndex: number,
  phenotype: Phenotype
]
