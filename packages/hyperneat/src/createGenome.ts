import type { GenomeFactory, InitConfig } from '@neat-evolution/core'
import {
  CPPNGenome,
  type CPPNGenomeFactoryOptions,
} from '@neat-evolution/cppn'

import type { HyperNEATContext } from './HyperNEATContext.js'
import type { HyperNEATGenomeOptions } from './HyperNEATGenomeOptions.js'

export const createGenome: GenomeFactory<HyperNEATContext> = (
  configProvider: HyperNEATContext['Config']['Type'],
  stateProvider: HyperNEATContext['State']['Type'],
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
