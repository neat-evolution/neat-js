import type { Config } from './config/Config.js'
import type { GenomeFactoryOptions } from './genome/GenomeFactory.js'
import type { GenomeOptions } from './genome/GenomeOptions.js'
import type { Link } from './link/Link.js'
import type { NEATGenome } from './NEATGenome.js'
import type { NEATGenomeData } from './NEATGenomeData.js'
import type { Node } from './node/Node.js'
import type { StateProvider } from './state/StateProvider.js'

export type NEATGenomeFactoryOptions<
  N extends Node<any, any, N>,
  L extends Link<any, any, L>,
  C extends Config<any, any>,
  S extends StateProvider<any, any, S>,
  GO extends GenomeOptions,
  GFO extends GenomeFactoryOptions<C, S, GO, GFO, GD, G>,
  GD extends NEATGenomeData<N, L, C, S, GO, GFO, GD, G>,
  G extends NEATGenome<N, L, C, S, GO, GFO, GD, G>
> = GenomeFactoryOptions<C, S, GO, GFO, GD, G>
