import type { ConfigFactory } from '@neat-js/core'
import type { ConfigProvider } from '@neat-js/core'
import type { Genome, GenomeData } from '@neat-js/core'
import type { GenomeFactory } from '@neat-js/core'
import type { GenomeOptions } from '@neat-js/core'
import type { LinkExtension } from '@neat-js/core'
import type { LinkFactory } from '@neat-js/core'
import type { NodeExtension } from '@neat-js/core'
import type { NodeFactory } from '@neat-js/core'
import type { StateFactory } from '@neat-js/core'
import type { StateProvider } from '@neat-js/core'
import type { PhenotypeFactory } from '@neat-js/phenotype'
import type { Stats } from '@neat-js/core'

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
