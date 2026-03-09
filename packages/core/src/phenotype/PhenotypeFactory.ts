import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type { Genome } from '../genome/Genome.js'

import type { Phenotype } from './Phenotype.js'

export type PhenotypeFactory<
  G extends Genome<Ctx>,
  Ctx extends AlgorithmContext,
> = (genome: G) => Phenotype
