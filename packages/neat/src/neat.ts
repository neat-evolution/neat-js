import type { InitConfig, NEATConfigOptions } from '@neat-js/core'
import { defaultNEATConfigOptions } from '@neat-js/core'
import type { Evaluator } from '@neat-js/evaluator'
import type {
  EvolutionOptions,
  PopulationOptions,
  ReproducerFactory,
  ReproducerFactoryOptions,
} from '@neat-js/evolution'
import { evolve, Population } from '@neat-js/evolution'

import type {
  DefaultNEATGenome,
  DefaultNEATGenomeData,
  DefaultNEATGenomeFactoryOptions,
} from './DefaultNEATGenome.js'
import { NEATAlgorithm } from './NEATAlgorithm.js'
import type { NEATConfig } from './NEATConfig.js'
import { type NEATGenomeOptions } from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'
import type { NEATState } from './NEATState.js'

export type NEATPopulation<RFO extends ReproducerFactoryOptions> = Population<
  NEATNode,
  NEATLink,
  NEATConfig,
  NEATState,
  NEATGenomeOptions,
  DefaultNEATGenomeFactoryOptions,
  DefaultNEATGenomeData,
  DefaultNEATGenome,
  typeof NEATAlgorithm,
  RFO
>

export type NEATReproducerFactory<RFO extends ReproducerFactoryOptions> =
  ReproducerFactory<DefaultNEATGenome, NEATPopulation<RFO>, RFO>

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
    neatConfigOptions ?? defaultNEATConfigOptions
  )
  const mergedGenomeOptions = {
    ...genomeOptions,
    ...evaluator.environment.description,
  }
  const population: NEATPopulation<RFO> = new Population(
    createReproducer,
    evaluator,
    NEATAlgorithm,
    configProvider,
    populationOptions,
    reproducerOptions,
    mergedGenomeOptions
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
