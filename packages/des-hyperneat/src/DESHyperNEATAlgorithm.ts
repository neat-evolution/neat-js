import type { Algorithm } from '@neat-evolution/core'
import type { PopulationCreator } from '@neat-evolution/evolution'
import { Population } from '@neat-evolution/evolution'

import { createConfig } from './createConfig.js'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import { createState } from './createState.js'
import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import { defaultDESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import { topologyInitConfig } from './topology/topologyInitConfig.js'

export const DESHyperNEATAlgorithm: Algorithm<DESHyperNEATContext> &
  PopulationCreator<DESHyperNEATContext> = {
  name: 'DES-HyperNEAT',
  pathname: '@neat-evolution/des-hyperneat',
  defaultOptions: defaultDESHyperNEATGenomeOptions,
  usesCPPNActivations: true,
  enableCustomState: true,
  createConfig,
  createGenome,
  createPhenotype,
  createState,

  writeBackWeights(): void {
    throw new Error(
      'writeBackWeights is not yet implemented for DES-HyperNEAT. ' +
        'Lamarckian writeback requires CPPN distillation for both ' +
        'substrate weights and biases.'
    )
  },

  createPopulation(
    createReproducer,
    evaluator,
    configData,
    populationOptions,
    genomeOptions,
    populationFactoryOptions
  ) {
    const configProvider = DESHyperNEATAlgorithm.createConfig(configData)
    // capture the real initConfig for createPhenotype later
    genomeOptions.initConfig = evaluator.environment.description
    // choose initConfig based on topology config options
    const initConfig = topologyInitConfig(
      evaluator.environment.description,
      genomeOptions
    )
    return new Population<DESHyperNEATContext>(
      createReproducer,
      evaluator,
      DESHyperNEATAlgorithm,
      configProvider,
      populationOptions,
      genomeOptions,
      initConfig,
      populationFactoryOptions
    )
  },
}
