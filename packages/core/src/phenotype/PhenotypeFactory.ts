import type { Genome } from '../genome/Genome.js'

import type { Phenotype } from './Phenotype.js'

export type PhenotypeFactory<
  G extends Genome<any, any, any, any, any, any, any, G>
> = (genome: G) => Phenotype
