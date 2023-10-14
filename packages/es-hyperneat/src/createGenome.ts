import type { InitConfig } from '@neat-js/core'
import {
  type CPPNGenomeFactory,
  type CPPNGenomeFactoryOptions,
  CPPNGenome,
} from '@neat-js/cppn'
import type { NEATConfig, NEATState } from '@neat-js/neat'

import { type ESHyperNEATGenomeOptions } from './ESHyperNEATGenomeOptions.js'

export const createGenome: CPPNGenomeFactory<ESHyperNEATGenomeOptions> = (
  configProvider: NEATConfig,
  stateProvider: NEATState,
  genomeOptions: ESHyperNEATGenomeOptions,
  _initConfig: InitConfig,
  genomeFactoryOptions?: CPPNGenomeFactoryOptions
) => {
  // force initConfig to be 4, 2
  const cppnInitConfig = {
    inputs: 4,
    outputs: 2,
  }

  return new CPPNGenome<ESHyperNEATGenomeOptions>(
    configProvider,
    stateProvider,
    genomeOptions,
    cppnInitConfig,
    createGenome,
    genomeFactoryOptions
  )
}
