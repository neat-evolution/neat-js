import type { GenomeFactory, InitConfig } from '@neat-evolution/core'

import type { CPPNContext } from './CPPNContext.js'
import { CPPNGenome } from './CPPNGenome.js'
import type { CPPNGenomeFactoryOptions } from './CPPNGenomeFactoryOptions.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'

export type CPPNGenomeFactory<GO extends CPPNGenomeOptions> = GenomeFactory<
  CPPNContext<GO>
>

export const createGenome: CPPNGenomeFactory<CPPNGenomeOptions> = (
  configProvider: CPPNContext['Config']['Type'],
  stateProvider: CPPNContext['State']['Type'],
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
