import type {
  ConfigData,
  GenomeFactory,
  InitConfig,
  StateData,
} from '@neat-evolution/core'

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
  ConfigData,
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
