import type {
  ConfigFactory,
  ConfigProvider,
  Genome,
  GenomeFactory,
  GenomeFactoryOptions,
  GenomeOptions,
  LinkExtension,
  LinkFactory,
  NodeExtension,
  NodeFactory,
  StateFactory,
  StateProvider,
  Stats,
} from '@neat-js/core'
import type { PhenotypeFactory } from '@neat-js/phenotype'

export interface Algorithm<
  N extends NodeExtension<any, any, N>,
  L extends LinkExtension<any, any, L>,
  T extends Stats,
  O extends GenomeOptions,
  FO extends GenomeFactoryOptions,
  G extends Genome<N, L, T, O, FO, G>
> {
  defaultOptions: O
  createConfig: ConfigFactory<
    N['config'],
    L['config'],
    ConfigProvider<N['config'], L['config']>
  >
  createGenome: GenomeFactory<O, FO, G>
  createLink: LinkFactory<L['config'], L['state'], L>
  createNode: NodeFactory<N['config'], N['state'], N>
  createPhenotype: PhenotypeFactory<G>
  createState: StateFactory<
    N['state'],
    L['state'],
    StateProvider<N['state'], L['state']>
  >
}
