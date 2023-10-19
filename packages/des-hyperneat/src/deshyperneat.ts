import type { NEATConfigOptions } from '@neat-js/core'
import { defaultNEATConfigOptions } from '@neat-js/core'
import type { Evaluator } from '@neat-js/evaluator'
import type {
  EvolutionOptions,
  PopulationOptions,
  ReproducerFactory,
  ReproducerFactoryOptions,
} from '@neat-js/evolution'
import { evolve, Population } from '@neat-js/evolution'

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
import type { TopologyOptions } from './TopologyOptions.js'

export type DESHyperNEATPopulation<RFO extends ReproducerFactoryOptions> =
  Population<
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
    typeof DESHyperNEATAlgorithm,
    RFO
  >

export type DESHyperNEATReproducerFactory<
  RFO extends ReproducerFactoryOptions
> = ReproducerFactory<DESHyperNEATGenome, DESHyperNEATPopulation<RFO>, RFO>

export const deshyperneat = async <RFO extends ReproducerFactoryOptions>(
  createReproducer: DESHyperNEATReproducerFactory<RFO>,
  evaluator: Evaluator,
  evolutionOptions: EvolutionOptions,
  topologyConfigOptions: TopologyOptions,
  cppnConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  reproducerOptions: RFO,
  genomeOptions: DESHyperNEATGenomeOptions
) => {
  const configProvider = DESHyperNEATAlgorithm.createConfig({
    neat: {
      ...defaultNEATConfigOptions,
      ...topologyConfigOptions,
    },
    cppn: cppnConfigOptions,
  })
  const initConfig = evaluator.environment.description
  const population: DESHyperNEATPopulation<RFO> = new Population(
    createReproducer,
    evaluator,
    DESHyperNEATAlgorithm,
    configProvider,
    populationOptions,
    reproducerOptions,
    genomeOptions,
    initConfig
  )

  await evolve(population, evolutionOptions)

  return population.best()
}
