import type {
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
  genomeOptions: Omit<HyperNEATGenomeOptions, keyof InitConfig>
) => {
  const configProvider = HyperNEATAlgorithm.createConfig(
    neatConfigOptions ?? defaultNEATConfigOptions,
    null,
    null
  )

  // FIXME: this is messy
  genomeOptions.initConfig = evaluator.environment.description
  const initConfig: InitConfig = {
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
    initConfig
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
