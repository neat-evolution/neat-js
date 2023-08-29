import type { Stats } from '../Stats.js'
import type { ConfigProvider } from '../config/ConfigProvider.js'
import type { LinkExtension } from '../link/Link.js'
import type { NodeExtension } from '../node/Node.js'
import type { StateProvider } from '../state/StateProvider.js'

import type { GenomeOptions } from './GenomeOptions.js'

export interface GenomeData<
  N extends NodeExtension<any, any, N>,
  L extends LinkExtension<any, any, L>,
  T extends Stats,
  O extends GenomeOptions,
  G extends Genome<N, L, T, O, G>
> {
  config: ReturnType<ConfigProvider<N['config'], L['config']>['toJSON']>
  state?: ReturnType<StateProvider<N['state'], L['state']>['toJSON']>
  options: O
}

export interface Genome<
  N extends NodeExtension<any, any, N>,
  L extends LinkExtension<any, any, L>,
  T extends Stats,
  O extends GenomeOptions,
  G extends Genome<N, L, T, O, G>
> {
  readonly config: ConfigProvider<N['config'], L['config']>
  readonly state: StateProvider<N['state'], L['state']>
  readonly options: O

  toJSON: () => GenomeData<N, L, T, O, G>
  clone: () => G
  crossover: (other: G, fitness: number, otherFitness: number) => G
  mutate: () => void
  distance?: (other: G) => number
  getStats: () => T
}
