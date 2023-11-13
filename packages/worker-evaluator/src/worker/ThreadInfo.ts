import type {
  ConfigFactory,
  GenomeFactory,
  PhenotypeFactory,
  StateFactory,
} from '@neat-evolution/core'
import type { StandardEnvironment } from '@neat-evolution/environment'
import type { ExecutorFactory } from '@neat-evolution/executor'

export type AnyGenomeFactory = GenomeFactory<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>

export interface ThreadInfo {
  createConfig: ConfigFactory<any, any, any, any, any>
  createExecutor: ExecutorFactory
  createGenome: AnyGenomeFactory
  createPhenotype: PhenotypeFactory<any>
  createState: StateFactory<any, any, any, any, any, any>
  environment: StandardEnvironment<any>
}
