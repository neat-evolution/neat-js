import type { InitConfig } from '@neat-js/core'
import {
  type CPPNGenomeFactory,
  type CPPNGenomeFactoryOptions,
  CPPNGenome,
} from '@neat-js/cppn'
import type { NEATConfig, NEATState } from '@neat-js/neat'

import { type HyperNEATGenomeOptions } from './HyperNEATGenomeOptions.js'

export const createGenome: CPPNGenomeFactory<HyperNEATGenomeOptions> = (
  configProvider: NEATConfig,
  stateProvider: NEATState,
  genomeOptions: HyperNEATGenomeOptions,
  _initConfig: InitConfig,
  genomeFactoryOptions?: CPPNGenomeFactoryOptions
) => {
  // FIXME: this is messy
  // force initConfig to be 4, 2
  const cppnInitConfig = {
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
