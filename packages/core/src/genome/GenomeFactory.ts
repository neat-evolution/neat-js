import type { ConfigProvider } from '../config/ConfigProvider.js'
import type { StateProvider } from '../state/StateProvider.js'

import type { Genome } from './Genome.js'
import type { GenomeData } from './GenomeData.js'
import type { GenomeOptions } from './GenomeOptions.js'

export type GenomeFactoryOptions<
  C extends ConfigProvider<any, any>,
  S extends StateProvider<any, any, S>,
  GO extends GenomeOptions,
  GFO extends GenomeFactoryOptions<C, S, GO, GFO, GD, G>,
  GD extends GenomeData<GO, G>,
  G extends Genome<any, any, C, S, GO, GFO, GD, G>
> = Omit<GD, 'config' | 'state' | 'genomeOptions'>

export type GenomeFactory<
  C extends ConfigProvider<any, any>,
  S extends StateProvider<any, any, S>,
  GO extends GenomeOptions,
  GFO extends GenomeFactoryOptions<C, S, GO, GFO, GD, G>,
  GD extends GenomeData<GO, G>,
  G extends Genome<any, any, C, S, GO, GFO, GD, G>
> = (
  configProvider: C,
  stateProvider: S,
  genomeOptions: GO,
  genomeFactoryOptions?: GFO
) => G
