import type { NEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  EvolutionOptions,
  PopulationOptions,
} from '@neat-evolution/evolution'
import { evolve } from '@neat-evolution/evolution'

import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'
import {
  createPopulation,
  type CPPNReproducerFactory,
} from './createPopulation.js'

export const cppn = async (
  createReproducer: CPPNReproducerFactory,
  evaluator: Evaluator<any>,
  evolutionOptions: EvolutionOptions<any, any>,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: CPPNGenomeOptions
) => {
  const population = createPopulation(
    createReproducer,
    evaluator,
    neatConfigOptions,
    populationOptions,
    genomeOptions
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
