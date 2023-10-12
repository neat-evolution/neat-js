import type { GenomeFactory, InitConfig, StateData } from '@neat-js/core'
import type { NEATConfig, NEATLinkData, NEATState } from '@neat-js/neat'

import { CPPNGenome } from './CPPNGenome.js'
import type {
  CPPNGenomeFactoryOptions,
  CPPNNodeData,
} from './CPPNGenomeFactoryOptions.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'

export type CPPNGenomeFactory<GO extends CPPNGenomeOptions> = GenomeFactory<
  null,
  null,
  NEATConfig,
  null,
  null,
  null,
  null,
  StateData,
  NEATState,
  CPPNNodeData,
  NEATLinkData,
  CPPNGenomeFactoryOptions,
  GO,
  CPPNGenome<GO>
>

export const createGenome: CPPNGenomeFactory<CPPNGenomeOptions> = (
  configProvider: NEATConfig,
  stateProvider: NEATState,
  genomeOptions: CPPNGenomeOptions,
  initConfig: InitConfig,
  genomeFactoryOptions?: CPPNGenomeFactoryOptions
) => {
  return new CPPNGenome<CPPNGenomeOptions>(
    configProvider,
    stateProvider,
    genomeOptions,
    initConfig,
    createGenome,
    genomeFactoryOptions
  )
}
