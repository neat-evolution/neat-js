import type {
  InitConfig,
  LinkFactoryOptions,
  NEATConfigOptions,
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
import type {
  NEATConfig,
  NEATLink,
  NEATLinkData,
  NEATState,
} from '@neat-js/neat'

import { CPPNAlgorithm } from './CPPNAlgorithm.js'
import type { CPPNGenome } from './CPPNGenome.js'
import type { CPPNGenomeData } from './CPPNGenomeData.js'
import type {
  CPPNGenomeFactoryOptions,
  CPPNNodeData,
} from './CPPNGenomeFactoryOptions.js'
import { type CPPNGenomeOptions } from './CPPNGenomeOptions.js'
import type { CPPNNode } from './CPPNNode.js'
import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'

export type CPPNPopulation<RFO extends ReproducerFactoryOptions> = Population<
  null,
  null,
  NEATConfig,
  null,
  null,
  null,
  null,
  StateData,
  NEATState,
  CPPNNodeData,
  NEATLinkData,
  CPPNGenomeFactoryOptions,
  CPPNGenomeOptions,
  CPPNGenomeData<CPPNGenomeOptions>,
  CPPNNodeFactoryOptions,
  CPPNNode,
  LinkFactoryOptions,
  NEATLink,
  CPPNGenome<CPPNGenomeOptions>,
  typeof CPPNAlgorithm,
  RFO
>

export type CPPNReproducerFactory<RFO extends ReproducerFactoryOptions> =
  ReproducerFactory<CPPNGenome<CPPNGenomeOptions>, CPPNPopulation<RFO>, RFO>

export const cppn = async <RFO extends ReproducerFactoryOptions>(
  createReproducer: CPPNReproducerFactory<RFO>,
  evaluator: Evaluator,
  evolutionOptions: EvolutionOptions,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  reproducerOptions: RFO,
  genomeOptions: Omit<CPPNGenomeOptions, keyof InitConfig>
) => {
  const configProvider = CPPNAlgorithm.createConfig(
    neatConfigOptions ?? defaultNEATConfigOptions,
    null,
    null
  )

  const initConfig = evaluator.environment.description

  const population: CPPNPopulation<RFO> = new Population(
    createReproducer,
    evaluator,
    CPPNAlgorithm,
    configProvider,
    populationOptions,
    reproducerOptions,
    genomeOptions,
    initConfig
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
