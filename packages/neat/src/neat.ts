import type { NEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import { evolve } from '@neat-evolution/evolution'
import type {
  EvolutionOptions,
  PopulationOptions,
} from '@neat-evolution/evolution'

import {
  createPopulation,
  type NEATReproducerFactory,
} from './createPopulation.js'
import type { NEATGenomeOptions } from './NEATGenomeOptions.js'

export const neat = async (
  createReproducer: NEATReproducerFactory,
  evaluator: Evaluator<any, any, any>,
  evolutionOptions: EvolutionOptions,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: NEATGenomeOptions
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
