import type { Config } from './config/Config.js'
import type { GenomeData } from './genome/GenomeData.js'
import type { GenomeOptions } from './genome/GenomeOptions.js'
import type { Link } from './link/Link.js'
import type { NEATGenome } from './NEATGenome.js'
import type { NEATGenomeFactoryOptions } from './NEATGenomeFactoryOptions.js'
import type { Node } from './node/Node.js'
import type { StateProvider } from './state/StateProvider.js'

export type NEATGenomeData<
  N extends Node<any, any, N>,
  L extends Link<any, any, L>,
  C extends Config<any, any>,
  S extends StateProvider<any, any, S>,
  GO extends GenomeOptions,
  GFO extends NEATGenomeFactoryOptions<N, L, C, S, GO, GFO, GD, G>,
  GD extends GenomeData<GO, G>,
  G extends NEATGenome<N, L, C, S, GO, GFO, GD, G>
> = GenomeData<GO, G>
