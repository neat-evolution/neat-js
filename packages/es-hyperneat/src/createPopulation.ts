import type { InitConfig, NEATConfigOptions } from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  PopulationFactory,
  PopulationFactoryOptions,
  PopulationOptions,
  ReproducerFactory,
} from '@neat-evolution/evolution'
import { Population } from '@neat-evolution/evolution'

import { ESHyperNEATAlgorithm } from './ESHyperNEATAlgorithm.js'
import type { ESHyperNEATContext } from './ESHyperNEATContext.js'
import type { ESHyperNEATGenomeOptions } from './ESHyperNEATGenomeOptions.js'

export type ESHyperNEATPopulation = Population<ESHyperNEATContext>

export type ESHyperNEATReproducerFactory = ReproducerFactory<ESHyperNEATPopulation>

export const createPopulation: PopulationFactory<ESHyperNEATContext> = (
  createReproducer: ESHyperNEATReproducerFactory,
  evaluator: Evaluator<any>,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: ESHyperNEATGenomeOptions,
  populationFactoryOptions?: PopulationFactoryOptions<
    ESHyperNEATContext['Config']['Data'],
    ESHyperNEATContext['State']['Data'],
    ESHyperNEATContext['Node']['HiddenData'],
    ESHyperNEATContext['Link']['Data'],
    ESHyperNEATContext['Genome']['FactoryOptions'],
    ESHyperNEATContext['Genome']['Options']
  >
): ESHyperNEATPopulation => {
  const configProvider = ESHyperNEATAlgorithm.createConfig({
    neat: neatConfigOptions ?? defaultNEATConfigOptions,
  })

  // capture the real initConfig for createPhenotype later
  genomeOptions.initConfig = evaluator.environment.description

  // force initConfig to be 4, 2
  const cppnInitConfig: InitConfig = {
    inputs: 4,
    outputs: 2,
  }

  const population: ESHyperNEATPopulation = new Population<ESHyperNEATContext>(
    createReproducer,
    evaluator,
    ESHyperNEATAlgorithm,
    configProvider,
    populationOptions,
    genomeOptions,
    cppnInitConfig,
    populationFactoryOptions
  )

  return population
}
