import type {
  GenomeFactory,
  InitConfig,
} from '@neat-evolution/core'

import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import { DESHyperNEATGenome } from './DESHyperNEATGenome.js'
import type { DESHyperNEATGenomeFactoryOptions } from './DESHyperNEATGenomeFactoryOptions.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'

export type DESHyperNEATGenomeFactory = GenomeFactory<DESHyperNEATContext>

export const createGenome: DESHyperNEATGenomeFactory = (
  configProvider: DESHyperNEATContext['Config']['Type'],
  stateProvider: DESHyperNEATContext['State']['Type'],
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
