import type {
  ConfigFactory,
  ConfigProvider,
  Genome,
  GenomeData,
  GenomeFactory,
  GenomeFactoryOptions,
  GenomeOptions,
  LinkExtension,
  LinkFactory,
  NodeExtension,
  NodeFactory,
  StateFactory,
  StateProvider,
} from '@neat-js/core'
import type { PhenotypeFactory } from '@neat-js/phenotype'

export interface Algorithm<
  N extends NodeExtension<any, any, N>,
  L extends LinkExtension<any, any, L>,
  C extends ConfigProvider<N['config'], L['config']>,
  S extends StateProvider<N['state'], L['state'], G['state']>,
  GO extends GenomeOptions,
  GFO extends GenomeFactoryOptions<C, S, GO, GFO, GD, G>,
  GD extends GenomeData<GO, G>,
  G extends Genome<N, L, C, S, GO, GFO, GD, G>
> {
  name: string
  defaultOptions: GO
  createConfig: ConfigFactory<N['config'], L['config'], C>
  createGenome: GenomeFactory<C, S, GO, GFO, GD, G>
  createLink: LinkFactory<L['config'], L['state'], L>
  createNode: NodeFactory<N['config'], N['state'], N>
  createPhenotype: PhenotypeFactory<G>
  createState: StateFactory<N['state'], L['state'], S>
}
