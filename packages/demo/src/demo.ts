import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  defaultCPPNGenomeOptions,
  cppn,
  CPPNAlgorithm,
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
} from '@neat-evolution/des-hyperneat'
import {
  defaultESHyperNEATGenomeOptions,
  eshyperneat,
  ESHyperNEATAlgorithm,
} from '@neat-evolution/es-hyperneat'
import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'
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
} from '@neat-evolution/hyperneat'
import {
  defaultNEATGenomeOptions,
  neat,
  NEATAlgorithm,
  type NEATReproducerFactory,
} from '@neat-evolution/neat'

export enum Methods {
  NEAT = 'NEAT',
  CPPN = 'CPPN',
  HyperNEAT = 'HyperNEAT',
  ES_HyperNEAT = 'ES-HyperNEAT',
  DES_HyperNEAT = 'DES-HyperNEAT',
}

export const method = Methods.DES_HyperNEAT

export const demo = async (
  createReproducer: ReproducerFactory<any, any>,
  createEvaluator: EvaluatorFactory<any, any>
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

  const evolutionOptions: EvolutionOptions<any, any> = {
    ...defaultEvolutionOptions,
    iterations: 5,
    secondsLimit: 20,
  }

  // Create evaluation strategy for genome fitness evaluation
  // IndividualStrategy evaluates each genome independently (default behavior)
  // Alternative strategies can be implemented for batch, tournament, or coevolution patterns
  const strategy = new IndividualStrategy()

  const evolve = async (method: Methods) => {
    switch (method) {
      case Methods.NEAT: {
        const evaluator = createEvaluator(NEATAlgorithm, environment, {
          strategy,
        })
        return await neat(
          createReproducer as NEATReproducerFactory,
          evaluator,
          evolutionOptions,
          defaultNEATConfigOptions,
          defaultPopulationOptions,
          defaultNEATGenomeOptions
        )
      }
      case Methods.CPPN: {
        const evaluator = createEvaluator(CPPNAlgorithm, environment, {
          strategy,
        })
        return await cppn(
          createReproducer,
          evaluator,
          evolutionOptions,
          defaultNEATConfigOptions,
          defaultPopulationOptions,
          defaultCPPNGenomeOptions
        )
      }
      case Methods.HyperNEAT: {
        const evaluator = createEvaluator(HyperNEATAlgorithm, environment, {
          strategy,
        })
        return await hyperneat(
          createReproducer,
          evaluator,
          evolutionOptions,
          defaultNEATConfigOptions,
          defaultPopulationOptions,
          defaultHyperNEATGenomeOptions
        )
      }
      case Methods.ES_HyperNEAT: {
        const evaluator = createEvaluator(ESHyperNEATAlgorithm, environment, {
          strategy,
        })
        return await eshyperneat(
          createReproducer,
          evaluator,
          evolutionOptions,
          defaultNEATConfigOptions,
          defaultPopulationOptions,
          defaultESHyperNEATGenomeOptions
        )
      }
      case Methods.DES_HyperNEAT: {
        const evaluator = createEvaluator(DESHyperNEATAlgorithm, environment, {
          strategy,
        })
        return await deshyperneat(
          createReproducer,
          evaluator,
          evolutionOptions,
          defaultTopologyConfigOptions,
          defaultNEATConfigOptions,
          defaultPopulationOptions,
          defaultDESHyperNEATGenomeOptions
        )
      }
    }
  }
  const best = await evolve(method)
  return best
}
