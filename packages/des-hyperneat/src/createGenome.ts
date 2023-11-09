import type {
  GenomeFactory,
  InitConfig,
  NEATConfigOptions,
} from '@neat-evolution/core'

import type { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import type { DESHyperNEATConfig } from './DESHyperNEATConfig.js'
import type { DESHyperNEATConfigData } from './DESHyperNEATConfigData.js'
import { DESHyperNEATGenome } from './DESHyperNEATGenome.js'
import type {
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATLinkData,
  DESHyperNEATNodeData,
} from './DESHyperNEATGenomeFactoryOptions.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import type { DESHyperNEATState } from './DESHyperNEATState.js'
import type { DESHyperNEATStateData } from './DESHyperNEATStateData.js'

export type DESHyperNEATGenomeFactory = GenomeFactory<
  NEATConfigOptions,
  NEATConfigOptions,
  DESHyperNEATConfigData,
  DESHyperNEATConfig,
  CustomStateData,
  CustomStateData,
  CustomState,
  CustomState,
  DESHyperNEATStateData,
  DESHyperNEATState,
  DESHyperNEATNodeData,
  DESHyperNEATLinkData,
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATGenomeOptions,
  DESHyperNEATGenome
>

export const createGenome: DESHyperNEATGenomeFactory = (
  configProvider: DESHyperNEATConfig,
  stateProvider: DESHyperNEATState,
  genomeOptions: DESHyperNEATGenomeOptions,
  initConfig: InitConfig,
  genomeFactoryOptions?: DESHyperNEATGenomeFactoryOptions
) => {
  return new DESHyperNEATGenome(
    configProvider,
    stateProvider,
    genomeOptions,
    initConfig,
    createGenome,
    genomeFactoryOptions
  )
}
