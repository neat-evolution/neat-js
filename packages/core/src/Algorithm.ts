import type { ConfigFactory } from './config/ConfigFactory.js'
import type { ConfigProvider } from './config/ConfigProvider.js'
import type { Genome } from './genome/Genome.js'
import type { GenomeData } from './genome/GenomeData.js'
import type {
  GenomeFactory,
  GenomeFactoryOptions,
} from './genome/GenomeFactory.js'
import type { GenomeOptions } from './genome/GenomeOptions.js'
import type { LinkExtension } from './link/LinkExtension.js'
import type { LinkFactory } from './link/LinkFactory.js'
import type { NodeExtension } from './node/NodeExtension.js'
import type { NodeFactory } from './node/NodeFactory.js'
import type { PhenotypeFactory } from './phenotype/PhenotypeFactory.js'
import type { StateFactory } from './state/StateFactory.js'
import type { StateProvider } from './state/StateProvider.js'

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
  pathname: string
  defaultOptions: GO
  createConfig: ConfigFactory<N['config'], L['config'], C>
  createGenome: GenomeFactory<C, S, GO, GFO, GD, G>
  createLink: LinkFactory<L['config'], L['state'], L>
  createNode: NodeFactory<N['config'], N['state'], N>
  createPhenotype: PhenotypeFactory<G>
  createState: StateFactory<N['state'], L['state'], S>
  toSharedBuffer: (data: GFO) => SharedArrayBuffer
  fromSharedBuffer: (data: SharedArrayBuffer) => GFO
}
