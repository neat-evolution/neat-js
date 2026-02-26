import type { InitConfig } from '@neat-evolution/core'
import {
  CPPNGenome,
  type CPPNGenomeFactory,
  type CPPNGenomeFactoryOptions,
} from '@neat-evolution/cppn'
import type { NEATConfig, NEATState } from '@neat-evolution/neat'

import type { HyperNEATGenomeOptions } from './HyperNEATGenomeOptions.js'

export const createGenome: CPPNGenomeFactory<HyperNEATGenomeOptions> = (
  configProvider: NEATConfig,
  stateProvider: NEATState,
  genomeOptions: HyperNEATGenomeOptions,
  _initConfig: InitConfig,
  genomeFactoryOptions?: CPPNGenomeFactoryOptions
) => {
  // force initConfig to be 4, 2
  const cppnInitConfig: InitConfig = {
    inputs: 4,
    outputs: 2,
  }

  return new CPPNGenome<HyperNEATGenomeOptions>(
    configProvider,
    stateProvider,
    genomeOptions,
    cppnInitConfig,
    createGenome,
    genomeFactoryOptions
  )
}
