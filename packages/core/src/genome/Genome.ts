import type { ConfigProvider } from '../config/ConfigProvider.js'
import type { LinkExtension } from '../link/LinkExtension.js'
import type { NodeExtension } from '../node/NodeExtension.js'
import type { StateProvider } from '../state/StateProvider.js'

import type { GenomeData } from './GenomeData.js'
import type { GenomeFactoryOptions } from './GenomeFactory.js'
import type { GenomeOptions } from './GenomeOptions.js'

export interface Genome<
  N extends NodeExtension<any, any, N>,
  L extends LinkExtension<any, any, L>,
  C extends ConfigProvider<N['config'], L['config']>,
  S extends StateProvider<N['state'], L['state'], G['state']>,
  GO extends GenomeOptions,
  GFO extends GenomeFactoryOptions<C, S, GO, GFO, GD, G>,
  GD extends GenomeData<GO, G>,
  G extends Genome<N, L, C, S, GO, GFO, GD, G>
> {
  readonly config: C
  readonly state: S
  readonly genomeOptions: GO

  toJSON: () => GD
  toFactoryOptions: () => GFO

  clone: () => G
  crossover: (other: G, fitness: number, otherFitness: number) => G
  mutate: () => void
  distance?: (other: G) => number
}
