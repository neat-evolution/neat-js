import type { NEATConfigOptions } from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  PopulationFactory,
  PopulationFactoryOptions,
  PopulationOptions,
  ReproducerFactory,
} from '@neat-evolution/evolution'
import { Population } from '@neat-evolution/evolution'

import { NEATAlgorithm } from './NEATAlgorithm.js'
import type { NEATContext } from './NEATContext.js'
import type { NEATGenomeOptions } from './NEATGenomeOptions.js'

export type NEATPopulation = Population<NEATContext>

export type NEATReproducerFactory = ReproducerFactory<NEATPopulation>

export const createPopulation: PopulationFactory<NEATContext> = (
  createReproducer: NEATReproducerFactory,
  evaluator: Evaluator<any>,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: NEATGenomeOptions,
  populationFactoryOptions?: PopulationFactoryOptions<
    NEATContext['Config']['Data'],
    NEATContext['State']['Data'],
    NEATContext['Node']['HiddenData'],
    NEATContext['Link']['Data'],
    NEATContext['Genome']['FactoryOptions'],
    NEATContext['Genome']['Options']
  >
): NEATPopulation => {
  const configProvider = NEATAlgorithm.createConfig({
    neat: neatConfigOptions ?? defaultNEATConfigOptions,
  })
  const initConfig = evaluator.environment.description
  const population: NEATPopulation = new Population<NEATContext>(
    createReproducer,
    evaluator,
    NEATAlgorithm,
    configProvider,
    populationOptions,
    genomeOptions,
    initConfig,
    populationFactoryOptions
  )

  return population
}
