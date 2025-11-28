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

import { CPPNAlgorithm } from './CPPNAlgorithm.js'
import type { CPPNGenome } from './CPPNGenome.js'
import type { CPPNGenomeData } from './CPPNGenomeData.js'
import type {
  CPPNGenomeFactoryOptions,
  CPPNNodeData,
} from './CPPNGenomeFactoryOptions.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'
import type { CPPNNode } from './CPPNNode.js'
import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'

export type CPPNPopulation = Population<
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
  typeof CPPNAlgorithm
>

export type CPPNReproducerFactory = ReproducerFactory<
  CPPNGenome<CPPNGenomeOptions>,
  CPPNPopulation
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
  CPPNGenomeOptions,
  CPPNGenomeData<CPPNGenomeOptions>,
  CPPNNodeFactoryOptions,
  CPPNNode,
  LinkFactoryOptions,
  NEATLink,
  CPPNGenome<CPPNGenomeOptions>
> = (
  createReproducer: CPPNReproducerFactory,
  evaluator: Evaluator<any>,
  neatConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: CPPNGenomeOptions,
  populationFactoryOptions?: PopulationFactoryOptions<
    ConfigData,
    StateData,
    CPPNNodeData,
    NEATLinkData,
    CPPNGenomeFactoryOptions,
    CPPNGenomeOptions
  >
): CPPNPopulation => {
  const configProvider = CPPNAlgorithm.createConfig({
    neat: neatConfigOptions ?? defaultNEATConfigOptions,
  })

  const initConfig = evaluator.environment.description

  const population: CPPNPopulation = new Population(
    createReproducer,
    evaluator,
    CPPNAlgorithm,
    configProvider,
    populationOptions,
    genomeOptions,
    initConfig,
    populationFactoryOptions
  )

  return population
}
