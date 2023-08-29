import type { Genome } from '@neat-js/core'

import type { Phenotype } from './Phenotype.js'

export type PhenotypeFactory<G extends Genome<any, any, any, any, G>> = (
  genome: G
) => Phenotype
