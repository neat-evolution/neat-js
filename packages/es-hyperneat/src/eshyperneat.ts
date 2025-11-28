import type { NEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  EvolutionOptions,
  PopulationOptions,
} from '@neat-evolution/evolution'
import { evolve } from '@neat-evolution/evolution'

import {
  createPopulation,
  type ESHyperNEATReproducerFactory,
} from './createPopulation.js'
import type { ESHyperNEATGenomeOptions } from './ESHyperNEATGenomeOptions.js'

export const eshyperneat = async (
  createReproducer: ESHyperNEATReproducerFactory,
  evaluator: Evaluator<any>,
  evolutionOptions: EvolutionOptions<any, any>,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: ESHyperNEATGenomeOptions
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
