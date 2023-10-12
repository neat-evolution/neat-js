import type { GenomeFactory, InitConfig, StateData } from '@neat-js/core'

import type { NEATConfig } from './NEATConfig.js'
import { NEATGenome } from './NEATGenome.js'
import type {
  NEATGenomeFactoryOptions,
  NEATHiddenNodeData,
  NEATLinkData,
} from './NEATGenomeFactoryOptions.js'
import type { NEATGenomeOptions } from './NEATGenomeOptions.js'
import type { NEATState } from './NEATState.js'

export const createGenome: GenomeFactory<
  null,
  null,
  NEATConfig,
  null,
  null,
  null,
  null,
  StateData,
  NEATState,
  NEATHiddenNodeData,
  NEATLinkData,
  NEATGenomeFactoryOptions,
  NEATGenomeOptions,
  NEATGenome
> = (
  configProvider: NEATConfig,
  stateProvider: NEATState,
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
