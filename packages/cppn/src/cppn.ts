import type { NEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  EvolutionOptions,
  PopulationOptions,
} from '@neat-evolution/evolution'
import { evolve } from '@neat-evolution/evolution'

import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'
import {
  type CPPNReproducerFactory,
  createPopulation,
} from './createPopulation.js'

export const cppn = async (
  createReproducer: CPPNReproducerFactory,
  evaluator: Evaluator,
  evolutionOptions: EvolutionOptions,
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

  await evolve(population as never, evolutionOptions as never)

  return population.best()
}
