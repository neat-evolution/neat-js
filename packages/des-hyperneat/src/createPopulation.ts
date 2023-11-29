import type { InitConfig, NEATConfigOptions } from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  PopulationOptions,
  ReproducerFactory,
} from '@neat-evolution/evolution'
import { Population } from '@neat-evolution/evolution'

import type { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import { DESHyperNEATAlgorithm } from './DESHyperNEATAlgorithm.js'
import type { DESHyperNEATConfig } from './DESHyperNEATConfig.js'
import type { DESHyperNEATConfigData } from './DESHyperNEATConfigData.js'
import type { DESHyperNEATConfigFactoryOptions } from './DESHyperNEATConfigFactoryOptions.js'
import type { DESHyperNEATGenome } from './DESHyperNEATGenome.js'
import type { DESHyperNEATGenomeData } from './DESHyperNEATGenomeData.js'
import type {
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATNodeData,
  DESHyperNEATLinkData,
} from './DESHyperNEATGenomeFactoryOptions.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import type { DESHyperNEATLink } from './DESHyperNEATLink.js'
import type { DESHyperNEATLinkFactoryOptions } from './DESHyperNEATLinkFactoryOptions.js'
import type { DESHyperNEATNode } from './DESHyperNEATNode.js'
import type { DESHyperNEATNodeFactoryOptions } from './DESHyperNEATNodeFactoryOptions.js'
import type { DESHyperNEATState } from './DESHyperNEATState.js'
import type { DESHyperNEATStateData } from './DESHyperNEATStateData.js'
import { topologyInitConfig } from './topology/topologyInitConfig.js'
import type { TopologyConfigOptions } from './TopologyConfigOptions.js'

export type DESHyperNEATPopulation = Population<
  DESHyperNEATConfigFactoryOptions,
  NEATConfigOptions,
  NEATConfigOptions,
  DESHyperNEATConfigData,
  DESHyperNEATConfig,
  CustomStateData,
  CustomStateData,
  CustomState,
  CustomState,
  DESHyperNEATStateData,
  DESHyperNEATState,
  DESHyperNEATNodeData,
  DESHyperNEATLinkData,
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATGenomeOptions,
  DESHyperNEATGenomeData,
  DESHyperNEATNodeFactoryOptions,
  DESHyperNEATNode,
  DESHyperNEATLinkFactoryOptions,
  DESHyperNEATLink,
  DESHyperNEATGenome,
  typeof DESHyperNEATAlgorithm
>

export type DESHyperNEATReproducerFactory = ReproducerFactory<
  DESHyperNEATGenome,
  DESHyperNEATPopulation
>

export const createPopulation = (
  createReproducer: DESHyperNEATReproducerFactory,
  evaluator: Evaluator<any, any, any>,
  // FIXME: should be TopologyConfigOptions & Partial<NeatConfigOptions>
  topologyConfigOptions: TopologyConfigOptions,
  cppnConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: DESHyperNEATGenomeOptions
): DESHyperNEATPopulation => {
  const configProvider = DESHyperNEATAlgorithm.createConfig({
    neat: {
      ...defaultNEATConfigOptions,
      ...topologyConfigOptions,
    },
    cppn: cppnConfigOptions,
  })

  // capture the real initConfig for createPhenotype later
  genomeOptions.initConfig = evaluator.environment.description

  // choose initConfig based on config options
  const initConfig: InitConfig = topologyInitConfig(
    evaluator.environment.description,
    genomeOptions
  )

  const population: DESHyperNEATPopulation = new Population(
    createReproducer,
    evaluator,
    DESHyperNEATAlgorithm,
    configProvider,
    populationOptions,
    genomeOptions,
    initConfig
  )

  return population
}
