import type {
  ConfigData,
  ConfigFactoryOptions,
  LinkFactoryOptions,
  NEATConfigOptions,
  StateData,
} from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  EvolutionOptions,
  PopulationOptions,
  ReproducerFactory,
  ReproducerFactoryOptions,
} from '@neat-evolution/evolution'
import { evolve, Population } from '@neat-evolution/evolution'
import type {
  NEATConfig,
  NEATLink,
  NEATLinkData,
  NEATState,
} from '@neat-evolution/neat'

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
  genomeOptions: CPPNGenomeOptions
) => {
  const configProvider = CPPNAlgorithm.createConfig({
    neat: neatConfigOptions ?? defaultNEATConfigOptions,
  })

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
