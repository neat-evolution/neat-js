import type { GenomeFactory } from '@neat-js/core'

import {
  DefaultNEATGenome,
  type DefaultNEATGenomeData,
  type DefaultNEATGenomeFactoryOptions,
} from './DefaultNEATGenome.js'
import type { NEATConfig } from './NEATConfig.js'
import { type NEATGenomeOptions } from './NEATGenomeOptions.js'
import type { NEATState } from './NEATState.js'

export const createGenome: GenomeFactory<
  NEATConfig,
  NEATState,
  NEATGenomeOptions,
  DefaultNEATGenomeFactoryOptions,
  DefaultNEATGenomeData,
  DefaultNEATGenome
> = (
  configProvider: NEATConfig,
  stateProvider: NEATState,
  genomeOptions: NEATGenomeOptions,
  genomeFactoryOptions?: DefaultNEATGenomeFactoryOptions
) => {
  return new DefaultNEATGenome(
    configProvider,
    stateProvider,
    genomeOptions,
    genomeFactoryOptions
  )
}
