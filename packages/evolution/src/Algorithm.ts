import type {
  ConfigFactory,
  ConfigProvider,
  Genome,
  GenomeData,
  GenomeFactory,
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
  G extends Genome<N, L, T, O, G>,
  D extends GenomeData<N, L, T, O, G>
> {
  defaultOptions: O
  createConfig: ConfigFactory<
    N['config'],
    L['config'],
    ConfigProvider<N['config'], L['config']>
  >
  createGenome: GenomeFactory<O, G, D>
  createLink: LinkFactory<L['config'], L['state'], L>
  createNode: NodeFactory<N['config'], N['state'], N>
  createPhenotype: PhenotypeFactory<G>
  createState: StateFactory<
    N['state'],
    L['state'],
    StateProvider<N['state'], L['state']>
  >
}
