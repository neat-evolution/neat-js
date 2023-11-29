import type { NEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  EvolutionOptions,
  PopulationOptions,
} from '@neat-evolution/evolution'
import { evolve } from '@neat-evolution/evolution'

import {
  createPopulation,
  type DESHyperNEATReproducerFactory,
} from './createPopulation.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import type { TopologyConfigOptions } from './TopologyConfigOptions.js'

export const deshyperneat = async (
  createReproducer: DESHyperNEATReproducerFactory,
  evaluator: Evaluator<any, any, any>,
  evolutionOptions: EvolutionOptions,
  // FIXME: should be TopologyConfigOptions & Partial<NeatConfigOptions>
  topologyConfigOptions: TopologyConfigOptions,
  cppnConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: DESHyperNEATGenomeOptions
) => {
  const population = createPopulation(
    createReproducer,
    evaluator,
    topologyConfigOptions,
    cppnConfigOptions,
    populationOptions,
    genomeOptions
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
