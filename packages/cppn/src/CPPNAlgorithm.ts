import type { Algorithm } from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import type { PopulationCreator } from '@neat-evolution/evolution'
import { Population } from '@neat-evolution/evolution'
import {
  createConfig as createNEATConfig,
  createState as createNEATState,
} from '@neat-evolution/neat'

import type { CPPNContext } from './CPPNContext.js'
import { defaultCPPNGenomeOptions } from './CPPNGenomeOptions.js'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import { writeBackWeights } from './writeBackWeights.js'

export const CPPNAlgorithm: Algorithm<CPPNContext> &
  PopulationCreator<CPPNContext> = {
  name: 'CPPN',
  pathname: '@neat-evolution/cppn',
  defaultOptions: defaultCPPNGenomeOptions,
  usesCPPNActivations: true,
  enableCustomState: false,
  createConfig: (factoryOptions) => createNEATConfig(factoryOptions),
  createGenome,
  createPhenotype,
  createState: () => createNEATState(),
  writeBackWeights,

  createPopulation(
    createReproducer,
    evaluator,
    configData,
    populationOptions,
    genomeOptions,
    populationFactoryOptions
  ) {
    const configProvider = CPPNAlgorithm.createConfig(
      configData ?? { neat: defaultNEATConfigOptions }
    )
    const initConfig = evaluator.environment.description
    return new Population<CPPNContext>(
      createReproducer,
      evaluator,
      CPPNAlgorithm,
      configProvider,
      populationOptions,
      genomeOptions,
      initConfig,
      populationFactoryOptions
    )
  },
}
