import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  CPPNAlgorithm,
  cppn,
  defaultCPPNGenomeOptions,
} from '@neat-evolution/cppn'
import {
  DatasetEnvironment,
  type DatasetOptions,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import {
  DESHyperNEATAlgorithm,
  defaultDESHyperNEATGenomeOptions,
  defaultTopologyConfigOptions,
  deshyperneat,
} from '@neat-evolution/des-hyperneat'
import {
  defaultESHyperNEATGenomeOptions,
  ESHyperNEATAlgorithm,
  eshyperneat,
} from '@neat-evolution/es-hyperneat'
import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'
import type { EvaluatorFactory } from '@neat-evolution/evaluator'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
  type EvolutionOptions,
  type Population,
  type ReproducerFactory,
} from '@neat-evolution/evolution'
import type { ExecutorFactory } from '@neat-evolution/executor'
import {
  defaultHyperNEATGenomeOptions,
  HyperNEATAlgorithm,
  hyperneat,
} from '@neat-evolution/hyperneat'
import {
  defaultNEATGenomeOptions,
  NEATAlgorithm,
  type NEATReproducerFactory,
  neat,
} from '@neat-evolution/neat'

export enum Methods {
  NEAT = 'NEAT',
  CPPN = 'CPPN',
  HyperNEAT = 'HyperNEAT',
  ES_HyperNEAT = 'ES-HyperNEAT',
  DES_HyperNEAT = 'DES-HyperNEAT',
}

export const method = Methods.DES_HyperNEAT

export interface DemoOptions {
  method?: Methods
  evolutionOptions?: Partial<EvolutionOptions<any, any>>
  datasetOptions?: Partial<DatasetOptions>
}

export const demo = async (
  createReproducer: ReproducerFactory<Population<any>>,
  createEvaluator: EvaluatorFactory<any, any>,
  createExecutor?: ExecutorFactory,
  options: DemoOptions = {}
) => {
  const selectedMethod = options.method ?? method
  const datasetOptions: DatasetOptions = {
    ...defaultDatasetOptions,
    dataset: new URL(
      // FIXME: make dataset pathname an env variable
      '../../generated/iris',
      import.meta.url
    ).pathname,
    validationFraction: 0.1,
    testFraction: 0.1,
    ...options.datasetOptions,
  }

  const dataset = await loadDataset(datasetOptions)
  const environment = new DatasetEnvironment(dataset)

  const evolutionOptions: EvolutionOptions<any, any> = {
    ...defaultEvolutionOptions,
    iterations: 2,
    secondsLimit: 5,
    ...options.evolutionOptions,
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
          createExecutor,
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
          createExecutor,
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
          createExecutor,
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
          createExecutor,
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
          createExecutor,
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
  const best = await evolve(selectedMethod)
  return best
}
