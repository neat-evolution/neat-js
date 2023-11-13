import type {
  ConfigData,
  ConfigFactoryOptions,
  LinkFactoryOptions,
  NEATConfigOptions,
  NodeFactoryOptions,
  StateData,
} from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  EvolutionOptions,
  PopulationOptions,
  ReproducerFactory,
} from '@neat-evolution/evolution'
import { evolve, Population } from '@neat-evolution/evolution'

import { NEATAlgorithm } from './NEATAlgorithm.js'
import type { NEATConfig } from './NEATConfig.js'
import type { NEATGenome } from './NEATGenome.js'
import type { NEATGenomeData } from './NEATGenomeData.js'
import type {
  NEATGenomeFactoryOptions,
  NEATHiddenNodeData,
  NEATLinkData,
} from './NEATGenomeFactoryOptions.js'
import type { NEATGenomeOptions } from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'
import type { NEATState } from './NEATState.js'

export type NEATPopulation = Population<
  ConfigFactoryOptions,
  null,
  null,
  ConfigData,
  NEATConfig,
  null,
  null,
  null,
  null,
  StateData,
  NEATState,
  NEATHiddenNodeData,
  NEATLinkData,
  NEATGenomeFactoryOptions,
  NEATGenomeOptions,
  NEATGenomeData,
  NodeFactoryOptions,
  NEATNode,
  LinkFactoryOptions,
  NEATLink,
  NEATGenome,
  typeof NEATAlgorithm
>

export type NEATReproducerFactory = ReproducerFactory<
  NEATGenome,
  NEATPopulation
>

export const neat = async (
  createReproducer: NEATReproducerFactory,
  evaluator: Evaluator<any, any, any>,
  evolutionOptions: EvolutionOptions,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: NEATGenomeOptions
) => {
  const configProvider = NEATAlgorithm.createConfig({
    neat: neatConfigOptions ?? defaultNEATConfigOptions,
  })
  const initConfig = evaluator.environment.description
  const population: NEATPopulation = new Population(
    createReproducer,
    evaluator,
    NEATAlgorithm,
    configProvider,
    populationOptions,
    genomeOptions,
    initConfig
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
