import type { InitConfig, NEATConfigOptions } from '@neat-js/core'
import { defaultNEATConfigOptions } from '@neat-js/core'
import type { Evaluator } from '@neat-js/evaluator'
import type { EvolutionOptions, PopulationOptions } from '@neat-js/evolution'
import {
  evolve,
  Population,
  defaultPopulationOptions,
} from '@neat-js/evolution'

import type {
  DefaultNEATGenome,
  DefaultNEATGenomeData,
  DefaultNEATGenomeFactoryOptions,
} from './DefaultNEATGenome.js'
import { NEATAlgorithm } from './NEATAlgorithm.js'
import type { NEATConfig } from './NEATConfig.js'
import {
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
} from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'
import type { NEATState } from './NEATState.js'

export const neat = async (
  evaluator: Evaluator,
  evolutionOptions: EvolutionOptions,
  neatConfigOptions?: NEATConfigOptions,
  populationOptions: PopulationOptions = defaultPopulationOptions,
  genomeOptions: Omit<
    NEATGenomeOptions,
    keyof InitConfig
  > = defaultNEATGenomeOptions
) => {
  const configProvider = NEATAlgorithm.createConfig(
    neatConfigOptions ?? defaultNEATConfigOptions
  )
  const mergedGenomeOptions = {
    ...genomeOptions,
    ...evaluator.environment.description,
  }
  const population = new Population<
    NEATNode,
    NEATLink,
    NEATConfig,
    NEATState,
    NEATGenomeOptions,
    DefaultNEATGenomeFactoryOptions,
    DefaultNEATGenomeData,
    DefaultNEATGenome,
    typeof NEATAlgorithm
  >(
    evaluator,
    NEATAlgorithm,
    configProvider,
    populationOptions,
    mergedGenomeOptions
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
