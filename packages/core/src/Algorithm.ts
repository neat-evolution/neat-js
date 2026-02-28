import type { AlgorithmContext } from './contexts/AlgorithmContext.js'
import type {
  GenomeOptionsOf,
  GenomeTypeOf,
} from './contexts/helpers.js'
import type { ConfigFactory } from './config/ConfigFactory.js'
import type { GenomeFactory } from './genome/GenomeFactory.js'
import type { PhenotypeFactory } from './phenotype/PhenotypeFactory.js'
import type { StateFactory } from './state/StateFactory.js'

export interface Algorithm<Ctx extends AlgorithmContext> {
  name: string
  pathname: string
  defaultOptions: GenomeOptionsOf<Ctx>
  createConfig: ConfigFactory<Ctx>
  createGenome: GenomeFactory<Ctx>
  createPhenotype: PhenotypeFactory<GenomeTypeOf<Ctx>>
  createState: StateFactory<Ctx>
}
