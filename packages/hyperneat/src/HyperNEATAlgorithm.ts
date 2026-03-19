import type { Algorithm, InitConfig } from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import type { CPPNGenome, CPPNGenomeOptions } from '@neat-evolution/cppn'
import { writeBackWeights as writeCPPNWeights } from '@neat-evolution/cppn'
import type { PopulationCreator } from '@neat-evolution/evolution'
import { Population } from '@neat-evolution/evolution'
import {
  createConfig as createNEATConfig,
  createState as createNEATState,
} from '@neat-evolution/neat'

import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import type { HyperNEATContext } from './HyperNEATContext.js'
import { defaultHyperNEATGenomeOptions } from './HyperNEATGenomeOptions.js'

export const HyperNEATAlgorithm: Algorithm<HyperNEATContext> &
  PopulationCreator<HyperNEATContext> = {
  name: 'HyperNEAT',
  pathname: '@neat-evolution/hyperneat',
  defaultOptions: defaultHyperNEATGenomeOptions,
  usesCPPNActivations: true,
  enableCustomState: false,
  createConfig: (factoryOptions) => createNEATConfig(factoryOptions),
  createGenome,
  createPhenotype,
  createState: () => createNEATState(),

  writeBackWeights(genome, payload) {
    writeCPPNWeights(
      genome as unknown as CPPNGenome<CPPNGenomeOptions>,
      payload.actions
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
    const configProvider = HyperNEATAlgorithm.createConfig(
      configData ?? { neat: defaultNEATConfigOptions }
    )
    // capture the real initConfig for createPhenotype later
    genomeOptions.initConfig = evaluator.environment.description
    // CPPN coordinate inputs: 4 inputs (x1, y1, x2, y2), 2 outputs (weight, bias)
    const cppnInitConfig: InitConfig = { inputs: 4, outputs: 2 }
    return new Population<HyperNEATContext>(
      createReproducer,
      evaluator,
      HyperNEATAlgorithm,
      configProvider,
      populationOptions,
      genomeOptions,
      cppnInitConfig,
      populationFactoryOptions
    )
  },
}
