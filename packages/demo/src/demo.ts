import { defaultNEATConfigOptions } from '@neat-js/core'
import {
  defaultCPPNGenomeOptions,
  cppn,
  CPPNAlgorithm,
  type CPPNReproducerFactory,
} from '@neat-js/cppn'
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-js/dataset-environment'
import type { EvaluatorFactory } from '@neat-js/evaluator'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
  type EvolutionOptions,
  type ReproducerFactory,
} from '@neat-js/evolution'
import {
  defaultHyperNEATGenomeOptions,
  hyperneat,
  HyperNEATAlgorithm,
  type HyperNEATReproducerFactory,
} from '@neat-js/hyperneat'
import {
  defaultNEATGenomeOptions,
  neat,
  NEATAlgorithm,
  type NEATReproducerFactory,
} from '@neat-js/neat'

enum Methods {
  NEAT = 'NEAT',
  CPPN = 'CPPN',
  HyperNEAT = 'HyperNEAT',
  ES_HyperNEAT = 'ES-HyperNEAT',
  DES_HyperNEAT = 'DES-HyperNEAT',
}

const method = Methods.HyperNEAT

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
      default: {
        throw new Error(`Unknown method: ${method}`)
      }
    }
  }
  const best = await evolve(method)
  return best
}
