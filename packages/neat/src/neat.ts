import type { InitConfig } from '@neat-js/core'
import { type NEATConfig } from '@neat-js/core'
import { defaultNEATConfigOptions } from '@neat-js/core'
import type { Evaluator } from '@neat-js/evaluator'
import type { EvolutionOptions } from '@neat-js/evolution'
import { evolve } from '@neat-js/evolution'
import { Population } from '@neat-js/evolution'
import {
  defaultPopulationOptions,
  type PopulationOptions,
} from '@neat-js/evolution'

import { createConfig } from './createConfig.js'
import type {
  DefaultNEATGenome,
  DefaultNEATGenomeData,
} from './DefaultNEATGenome.js'
import { NEATAlgorithm } from './NEATAlgorithm.js'
import {
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
} from './NEATGenomeOptions.js'

export const neat = async (
  evaluator: Evaluator,
  options: EvolutionOptions,
  configProvider?: NEATConfig,
  populationOptions: PopulationOptions = defaultPopulationOptions,
  genomeOptions: Omit<
    NEATGenomeOptions,
    keyof InitConfig
  > = defaultNEATGenomeOptions
) => {
  const population = new Population<
    NEATGenomeOptions,
    DefaultNEATGenome,
    DefaultNEATGenomeData
  >(
    evaluator,
    NEATAlgorithm.createPhenotype,
    NEATAlgorithm.createGenome,
    NEATAlgorithm.createState,
    populationOptions,
    configProvider ?? createConfig(defaultNEATConfigOptions),
    {
      ...genomeOptions,
      ...evaluator.environment.description,
    }
  )

  await evolve(population, options)

  return population.best()
}
