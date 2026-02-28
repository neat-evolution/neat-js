import type { InitConfig, NEATConfigOptions } from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import type { Evaluator } from '@neat-evolution/evaluator'
import type {
  PopulationFactoryOptions,
  PopulationOptions,
  ReproducerFactory,
} from '@neat-evolution/evolution'
import { Population } from '@neat-evolution/evolution'

import { DESHyperNEATAlgorithm } from './DESHyperNEATAlgorithm.js'
import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import type { TopologyConfigOptions } from './TopologyConfigOptions.js'
import { topologyInitConfig } from './topology/topologyInitConfig.js'

export type DESHyperNEATPopulation = Population<DESHyperNEATContext>

export type DESHyperNEATReproducerFactory = ReproducerFactory<DESHyperNEATPopulation>

// FIXME: not a valid PopulationFactory
export const createPopulation = (
  createReproducer: DESHyperNEATReproducerFactory,
  evaluator: Evaluator<any>,
  // FIXME: should be TopologyConfigOptions & Partial<NeatConfigOptions>
  topologyConfigOptions: TopologyConfigOptions,
  cppnConfigOptions: NEATConfigOptions,
  populationOptions: PopulationOptions,
  genomeOptions: DESHyperNEATGenomeOptions,
  populationFactoryOptions?: PopulationFactoryOptions<
    DESHyperNEATContext['Config']['Data'],
    DESHyperNEATContext['State']['Data'],
    DESHyperNEATContext['Node']['HiddenData'],
    DESHyperNEATContext['Link']['Data'],
    DESHyperNEATContext['Genome']['FactoryOptions'],
    DESHyperNEATContext['Genome']['Options']
  >
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

  const population: DESHyperNEATPopulation = new Population<DESHyperNEATContext>(
    createReproducer,
    evaluator,
    DESHyperNEATAlgorithm,
    configProvider,
    populationOptions,
    genomeOptions,
    initConfig,
    populationFactoryOptions
  )

  return population
}
