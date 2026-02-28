import type { GenomeFactory, InitConfig } from '@neat-evolution/core'

import type { NEATContext } from './NEATContext.js'
import { NEATGenome } from './NEATGenome.js'
import type { NEATGenomeFactoryOptions } from './NEATGenomeFactoryOptions.js'
import type { NEATGenomeOptions } from './NEATGenomeOptions.js'

export const createGenome: GenomeFactory<NEATContext> = (
  configProvider: NEATContext['Config']['Type'],
  stateProvider: NEATContext['State']['Type'],
  genomeOptions: NEATGenomeOptions,
  initConfig: InitConfig,
  genomeFactoryOptions?: NEATGenomeFactoryOptions
) => {
  return new NEATGenome(
    configProvider,
    stateProvider,
    genomeOptions,
    initConfig,
    genomeFactoryOptions
  )
}
