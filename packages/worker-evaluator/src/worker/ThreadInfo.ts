import type {
  AlgorithmContext,
  ConfigFactory,
  Genome,
  GenomeFactory,
  PhenotypeFactory,
  StateFactory,
} from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'
import type { ExecutorFactory } from '@neat-evolution/executor'

export type AnyGenomeFactory = GenomeFactory

export interface ThreadInfo {
  createConfig: ConfigFactory
  createExecutor: ExecutorFactory
  createGenome: AnyGenomeFactory
  createPhenotype: PhenotypeFactory<Genome<AlgorithmContext>, AlgorithmContext>
  createState: StateFactory<AlgorithmContext>
  environment: Environment
}
