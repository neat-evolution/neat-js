import type {
  ConfigData,
  ConfigFactoryOptions,
  InitConfig,
  LinkFactoryOptions,
  NEATConfigOptions,
  StateData,
} from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  type CPPNGenome,
  type CPPNGenomeData,
  type CPPNGenomeFactoryOptions,
  type CPPNNodeData,
  type CPPNNode,
  type CPPNNodeFactoryOptions,
} from '@neat-evolution/cppn'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  PopulationFactory,
  PopulationFactoryOptions,
  PopulationOptions,
  ReproducerFactory,
} from '@neat-evolution/evolution'
import { Population } from '@neat-evolution/evolution'
import type {
  NEATConfig,
  NEATLink,
  NEATLinkData,
  NEATState,
} from '@neat-evolution/neat'

import { ESHyperNEATAlgorithm } from './ESHyperNEATAlgorithm.js'
import type { ESHyperNEATGenomeOptions } from './ESHyperNEATGenomeOptions.js'

export type ESHyperNEATPopulation = Population<
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
  typeof ESHyperNEATAlgorithm
>

export type ESHyperNEATReproducerFactory = ReproducerFactory<
  CPPNGenome<ESHyperNEATGenomeOptions>,
  ESHyperNEATPopulation
>

export const createPopulation: PopulationFactory<
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
  CPPNGenome<ESHyperNEATGenomeOptions>
> = (
  createReproducer: ESHyperNEATReproducerFactory,
  evaluator: Evaluator<any>,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: ESHyperNEATGenomeOptions,
  populationFactoryOptions?: PopulationFactoryOptions<
    ConfigData,
    StateData,
    CPPNNodeData,
    NEATLinkData,
    CPPNGenomeFactoryOptions,
    ESHyperNEATGenomeOptions
  >
): ESHyperNEATPopulation => {
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

  const population: ESHyperNEATPopulation = new Population(
    createReproducer,
    evaluator,
    ESHyperNEATAlgorithm,
    configProvider,
    populationOptions,
    genomeOptions,
    cppnInitConfig,
    populationFactoryOptions
  )

  return population
}
