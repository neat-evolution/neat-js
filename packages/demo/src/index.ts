import type { InitConfig, NEATConfig } from '@neat-js/core'
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
  NEATGenomeOptions,
} from '@neat-js/neat'
import {
  createConfig,
  NEATAlgorithm,
  defaultNEATGenomeOptions,
} from '@neat-js/neat'

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
