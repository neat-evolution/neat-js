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

import { HyperNEATAlgorithm } from './HyperNEATAlgorithm.js'
import type { HyperNEATContext } from './HyperNEATContext.js'
import type { HyperNEATGenomeOptions } from './HyperNEATGenomeOptions.js'

export type HyperNEATPopulation = Population<HyperNEATContext>

export type HyperNEATReproducerFactory = ReproducerFactory<HyperNEATPopulation>

export const createPopulation: PopulationFactory<HyperNEATContext> = (
  createReproducer: HyperNEATReproducerFactory,
  evaluator: Evaluator,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: HyperNEATGenomeOptions,
  populationFactoryOptions?: PopulationFactoryOptions<
    HyperNEATContext['Config']['Data'],
    HyperNEATContext['State']['Data'],
    HyperNEATContext['Node']['HiddenData'],
    HyperNEATContext['Link']['Data'],
    HyperNEATContext['Genome']['FactoryOptions'],
    HyperNEATContext['Genome']['Options']
  >
): HyperNEATPopulation => {
  const configProvider = HyperNEATAlgorithm.createConfig({
    neat: neatConfigOptions ?? defaultNEATConfigOptions,
  })

  // capture the real initConfig for createPhenotype later
  genomeOptions.initConfig = evaluator.environment.description

  // force initConfig to be 4, 2
  const cppnInitConfig: InitConfig = {
    inputs: 4,
    outputs: 2,
  }

  const population: HyperNEATPopulation = new Population<HyperNEATContext>(
    createReproducer,
    evaluator,
    HyperNEATAlgorithm,
    configProvider,
    populationOptions,
    genomeOptions,
    cppnInitConfig,
    populationFactoryOptions
  )
  return population
}
