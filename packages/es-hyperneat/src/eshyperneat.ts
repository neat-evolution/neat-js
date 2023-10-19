import type {
  ConfigData,
  ConfigFactoryOptions,
  InitConfig,
  LinkFactoryOptions,
  NEATConfigOptions,
  StateData,
} from '@neat-js/core'
import { defaultNEATConfigOptions } from '@neat-js/core'
import {
  type CPPNGenome,
  type CPPNGenomeData,
  type CPPNGenomeFactoryOptions,
  type CPPNNodeData,
  type CPPNNode,
  type CPPNNodeFactoryOptions,
} from '@neat-js/cppn'
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

import { ESHyperNEATAlgorithm } from './ESHyperNEATAlgorithm.js'
import type { ESHyperNEATGenomeOptions } from './ESHyperNEATGenomeOptions.js'

export type ESHyperNEATPopulation<RFO extends ReproducerFactoryOptions> =
  Population<
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
    ESHyperNEATGenomeOptions,
    CPPNGenomeData<ESHyperNEATGenomeOptions>,
    CPPNNodeFactoryOptions,
    CPPNNode,
    LinkFactoryOptions,
    NEATLink,
    CPPNGenome<ESHyperNEATGenomeOptions>,
    typeof ESHyperNEATAlgorithm,
    RFO
  >

export type ESHyperNEATReproducerFactory<RFO extends ReproducerFactoryOptions> =
  ReproducerFactory<
    CPPNGenome<ESHyperNEATGenomeOptions>,
    ESHyperNEATPopulation<RFO>,
    RFO
  >

export const eshyperneat = async <RFO extends ReproducerFactoryOptions>(
  createReproducer: ESHyperNEATReproducerFactory<RFO>,
  evaluator: Evaluator,
  evolutionOptions: EvolutionOptions,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  reproducerOptions: RFO,
  genomeOptions: ESHyperNEATGenomeOptions
) => {
  const configProvider = ESHyperNEATAlgorithm.createConfig({
    neat: neatConfigOptions ?? defaultNEATConfigOptions,
  })

  // capture the real initConfig for createPhenotype later
  genomeOptions.initConfig = evaluator.environment.description

  // force initConfig to be 4, 2
  const cppnInitConfig: InitConfig = {
    inputs: 4,
    outputs: 2,
  }

  const population: ESHyperNEATPopulation<RFO> = new Population(
    createReproducer,
    evaluator,
    ESHyperNEATAlgorithm,
    configProvider,
    populationOptions,
    reproducerOptions,
    genomeOptions,
    cppnInitConfig
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
