import type { GenomeFactory, InitConfig } from '@neat-evolution/core'
import {
  CPPNGenome,
  type CPPNGenomeFactoryOptions,
} from '@neat-evolution/cppn'

import type { ESHyperNEATContext } from './ESHyperNEATContext.js'
import type { ESHyperNEATGenomeOptions } from './ESHyperNEATGenomeOptions.js'

export const createGenome: GenomeFactory<ESHyperNEATContext> = (
  configProvider: ESHyperNEATContext['Config']['Type'],
  stateProvider: ESHyperNEATContext['State']['Type'],
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
