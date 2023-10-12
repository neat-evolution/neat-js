import type {
  InitConfig,
  LinkFactoryOptions,
  NEATConfigOptions,
  NodeFactoryOptions,
  StateData,
} from '@neat-js/core'
import { defaultNEATConfigOptions } from '@neat-js/core'
import type { Evaluator } from '@neat-js/evaluator'
import type {
  EvolutionOptions,
  PopulationOptions,
  ReproducerFactory,
  ReproducerFactoryOptions,
} from '@neat-js/evolution'
import { evolve, Population } from '@neat-js/evolution'

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

export type NEATPopulation<RFO extends ReproducerFactoryOptions> = Population<
  null,
  null,
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
  typeof NEATAlgorithm,
  RFO
>

export type NEATReproducerFactory<RFO extends ReproducerFactoryOptions> =
  ReproducerFactory<NEATGenome, NEATPopulation<RFO>, RFO>

export const neat = async <RFO extends ReproducerFactoryOptions>(
  createReproducer: NEATReproducerFactory<RFO>,
  evaluator: Evaluator,
  evolutionOptions: EvolutionOptions,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  reproducerOptions: RFO,
  genomeOptions: Omit<NEATGenomeOptions, keyof InitConfig>
) => {
  const configProvider = NEATAlgorithm.createConfig(
    neatConfigOptions ?? defaultNEATConfigOptions,
    null,
    null
  )
  const initConfig = evaluator.environment.description
  const population: NEATPopulation<RFO> = new Population(
    createReproducer,
    evaluator,
    NEATAlgorithm,
    configProvider,
    populationOptions,
    reproducerOptions,
    genomeOptions,
    initConfig
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
