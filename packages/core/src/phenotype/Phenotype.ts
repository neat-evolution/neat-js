import type { PhenotypeAction } from './PhenotypeAction.js'

export interface Phenotype {
  length: number
  inputs: number[]
  outputs: number[]
  actions: PhenotypeAction[]
}
