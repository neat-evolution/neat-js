import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  defaultCPPNGenomeOptions,
  cppn,
  CPPNAlgorithm,
  type CPPNReproducerFactory,
} from '@neat-evolution/cppn'
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import {
  defaultDESHyperNEATGenomeOptions,
  defaultTopologyConfigOptions,
  deshyperneat,
  DESHyperNEATAlgorithm,
  type DESHyperNEATReproducerFactory,
} from '@neat-evolution/des-hyperneat'
import {
  defaultESHyperNEATGenomeOptions,
  eshyperneat,
  ESHyperNEATAlgorithm,
  type ESHyperNEATReproducerFactory,
} from '@neat-evolution/es-hyperneat'
import type { EvaluatorFactory } from '@neat-evolution/evaluator'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
  type EvolutionOptions,
  type ReproducerFactory,
} from '@neat-evolution/evolution'
import {
  defaultHyperNEATGenomeOptions,
  hyperneat,
  HyperNEATAlgorithm,
  type HyperNEATReproducerFactory,
} from '@neat-evolution/hyperneat'
import {
  defaultNEATGenomeOptions,
  neat,
  NEATAlgorithm,
  type NEATReproducerFactory,
} from '@neat-evolution/neat'

enum Methods {
  NEAT = 'NEAT',
  CPPN = 'CPPN',
  HyperNEAT = 'HyperNEAT',
  ES_HyperNEAT = 'ES-HyperNEAT',
  DES_HyperNEAT = 'DES-HyperNEAT',
}

const method = Methods.DES_HyperNEAT

export const demo = async (
  createReproducer: ReproducerFactory<any, any, any>,
  createEvaluator: EvaluatorFactory<null>
) => {
  const datasetOptions = defaultDatasetOptions
  datasetOptions.dataset = new URL(
    // FIXME: make dataset pathname an env variable
    '../../generated/iris',
    import.meta.url
  ).pathname
  datasetOptions.validationFraction = 0.1
  datasetOptions.testFraction = 0.1

  const dataset = await loadDataset(datasetOptions)
  const environment = new DatasetEnvironment(dataset)

  const evolutionOptions: EvolutionOptions = {
    ...defaultEvolutionOptions,
    iterations: 5_000,
    secondsLimit: 600,
  }

  const evolve = async (method: Methods) => {
    switch (method) {
      case Methods.NEAT: {
        const evaluator = createEvaluator(NEATAlgorithm, environment, null)
        return await neat(
          createReproducer as NEATReproducerFactory<undefined>,
          evaluator,
          evolutionOptions,
          defaultNEATConfigOptions,
          defaultPopulationOptions,
          undefined,
          defaultNEATGenomeOptions
        )
      }
      case Methods.CPPN: {
        const evaluator = createEvaluator(CPPNAlgorithm, environment, null)
        return await cppn(
          createReproducer as CPPNReproducerFactory<undefined>,
          evaluator,
          evolutionOptions,
          defaultNEATConfigOptions,
          defaultPopulationOptions,
          undefined,
          defaultCPPNGenomeOptions
        )
      }
      case Methods.HyperNEAT: {
        const evaluator = createEvaluator(HyperNEATAlgorithm, environment, null)
        return await hyperneat(
          createReproducer as HyperNEATReproducerFactory<undefined>,
          evaluator,
          evolutionOptions,
          defaultNEATConfigOptions,
          defaultPopulationOptions,
          undefined,
          defaultHyperNEATGenomeOptions
        )
      }
      case Methods.ES_HyperNEAT: {
        const evaluator = createEvaluator(
          ESHyperNEATAlgorithm,
          environment,
          null
        )
        return await eshyperneat(
          createReproducer as ESHyperNEATReproducerFactory<undefined>,
          evaluator,
          evolutionOptions,
          defaultNEATConfigOptions,
          defaultPopulationOptions,
          undefined,
          defaultESHyperNEATGenomeOptions
        )
      }
      case Methods.DES_HyperNEAT: {
        const evaluator = createEvaluator(
          DESHyperNEATAlgorithm,
          environment,
          null
        )
        return await deshyperneat(
          createReproducer as DESHyperNEATReproducerFactory<undefined>,
          evaluator,
          evolutionOptions,
          defaultTopologyConfigOptions,
          defaultNEATConfigOptions,
          defaultPopulationOptions,
          undefined,
          defaultDESHyperNEATGenomeOptions
        )
      }
    }
  }
  const best = await evolve(method)
  return best
}
