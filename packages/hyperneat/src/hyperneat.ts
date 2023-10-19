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

import { HyperNEATAlgorithm } from './HyperNEATAlgorithm.js'
import type { HyperNEATGenomeOptions } from './HyperNEATGenomeOptions.js'

export type HyperNEATPopulation<RFO extends ReproducerFactoryOptions> =
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
    HyperNEATGenomeOptions,
    CPPNGenomeData<HyperNEATGenomeOptions>,
    CPPNNodeFactoryOptions,
    CPPNNode,
    LinkFactoryOptions,
    NEATLink,
    CPPNGenome<HyperNEATGenomeOptions>,
    typeof HyperNEATAlgorithm,
    RFO
  >

export type HyperNEATReproducerFactory<RFO extends ReproducerFactoryOptions> =
  ReproducerFactory<
    CPPNGenome<HyperNEATGenomeOptions>,
    HyperNEATPopulation<RFO>,
    RFO
  >

export const hyperneat = async <RFO extends ReproducerFactoryOptions>(
  createReproducer: HyperNEATReproducerFactory<RFO>,
  evaluator: Evaluator,
  evolutionOptions: EvolutionOptions,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  reproducerOptions: RFO,
  genomeOptions: HyperNEATGenomeOptions
) => {
  const configProvider = HyperNEATAlgorithm.createConfig({
    neat: neatConfigOptions ?? defaultNEATConfigOptions,
  })

  // capture the real initConfig for createPhenotype later
  genomeOptions.initConfig = evaluator.environment.description

  // force initConfig to be 4, 2
  const cppnInitConfig: InitConfig = {
    inputs: 4,
    outputs: 2,
  }

  const population: HyperNEATPopulation<RFO> = new Population(
    createReproducer,
    evaluator,
    HyperNEATAlgorithm,
    configProvider,
    populationOptions,
    reproducerOptions,
    genomeOptions,
    cppnInitConfig
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
