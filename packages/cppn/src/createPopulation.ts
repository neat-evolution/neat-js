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

import { CPPNAlgorithm } from './CPPNAlgorithm.js'
import type { CPPNContext } from './CPPNContext.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'

export type CPPNPopulation = Population<CPPNContext>

export type CPPNReproducerFactory = ReproducerFactory<CPPNPopulation>

export const createPopulation: PopulationFactory<CPPNContext> = (
  createReproducer: CPPNReproducerFactory,
  evaluator: Evaluator<any>,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: CPPNGenomeOptions,
  populationFactoryOptions?: PopulationFactoryOptions<
    CPPNContext['Config']['Data'],
    CPPNContext['State']['Data'],
    CPPNContext['Node']['HiddenData'],
    CPPNContext['Link']['Data'],
    CPPNContext['Genome']['FactoryOptions'],
    CPPNContext['Genome']['Options']
  >
): CPPNPopulation => {
  const configProvider = CPPNAlgorithm.createConfig({
    neat: neatConfigOptions ?? defaultNEATConfigOptions,
  })

  const initConfig = evaluator.environment.description

  const population: CPPNPopulation = new Population<CPPNContext>(
    createReproducer,
    evaluator,
    CPPNAlgorithm,
    configProvider,
    populationOptions,
    genomeOptions,
    initConfig,
    populationFactoryOptions
  )

  return population
}
