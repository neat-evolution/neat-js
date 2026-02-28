import type {
  ConfigFactory,
  GenomeFactory,
  PhenotypeFactory,
  StateFactory,
} from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'
import type { ExecutorFactory } from '@neat-evolution/executor'

export type AnyGenomeFactory = GenomeFactory<any>

export interface ThreadInfo {
  createConfig: ConfigFactory<any>
  createExecutor: ExecutorFactory
  createGenome: AnyGenomeFactory
  createPhenotype: PhenotypeFactory<any>
  createState: StateFactory<any>
  environment: Environment<any>
}
