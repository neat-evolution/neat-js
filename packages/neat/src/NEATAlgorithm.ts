import type { Algorithm } from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import type { PopulationCreator } from '@neat-evolution/evolution'
import { Population } from '@neat-evolution/evolution'

import { createConfig } from './createConfig.js'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import { createState } from './createState.js'
import type { NEATContext } from './NEATContext.js'
import { defaultNEATGenomeOptions } from './NEATGenomeOptions.js'
import { writeBackWeights } from './writeBackWeights.js'

export const NEATAlgorithm: Algorithm<NEATContext> &
  PopulationCreator<NEATContext> = {
  name: 'NEAT',
  pathname: '@neat-evolution/neat',
  defaultOptions: defaultNEATGenomeOptions,
  usesCPPNActivations: false,
  enableCustomState: false,
  createConfig,
  createGenome,
  createPhenotype,
  createState,
  writeBackWeights,

  createPopulation(
    createReproducer,
    evaluator,
    configData,
    populationOptions,
    genomeOptions,
    populationFactoryOptions
  ) {
    const configProvider = NEATAlgorithm.createConfig(
      configData ?? { neat: defaultNEATConfigOptions }
    )
    const initConfig = evaluator.environment.description
    return new Population<NEATContext>(
      createReproducer,
      evaluator,
      NEATAlgorithm,
      configProvider,
      populationOptions,
      genomeOptions,
      initConfig,
      populationFactoryOptions
    )
  },
}
