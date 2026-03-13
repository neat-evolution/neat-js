import type { AlgorithmContext } from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import { CPPNAlgorithm } from '@neat-evolution/cppn'
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
} from '@neat-evolution/des-hyperneat'
import { ESHyperNEATAlgorithm } from '@neat-evolution/es-hyperneat'
import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
  type EvolutionOptions,
  type Organism,
  type PopulationOptions,
} from '@neat-evolution/evolution'
import {
  type EvaluationConfig,
  EvolutionManager,
  type EvolutionManagerConfig,
  type WorkerConfig,
} from '@neat-evolution/evolution-manager'
import { HyperNEATAlgorithm } from '@neat-evolution/hyperneat'
import { NEATAlgorithm } from '@neat-evolution/neat'

export enum Methods {
  NEAT = 'NEAT',
  CPPN = 'CPPN',
  HyperNEAT = 'HyperNEAT',
  ES_HyperNEAT = 'ES-HyperNEAT',
  DES_HyperNEAT = 'DES-HyperNEAT',
}

export const method = Methods.DES_HyperNEAT

type ErasedManagerConfig = Pick<
  EvolutionManagerConfig,
  'algorithm' | 'configData' | 'genomeOptions'
>

/** Build algorithm-specific config fields for EvolutionManagerConfig.
 *  Type-erased: each algorithm has a specific Ctx, but the demo
 *  works with all of them generically. EvolutionManager erases types internally. */
function algorithmConfig(selectedMethod: Methods): ErasedManagerConfig {
  switch (selectedMethod) {
    case Methods.NEAT:
      return { algorithm: NEATAlgorithm } as unknown as ErasedManagerConfig
    case Methods.CPPN:
      return { algorithm: CPPNAlgorithm } as unknown as ErasedManagerConfig
    case Methods.HyperNEAT:
      return {
        algorithm: HyperNEATAlgorithm,
      } as unknown as ErasedManagerConfig
    case Methods.ES_HyperNEAT:
      return {
        algorithm: ESHyperNEATAlgorithm,
      } as unknown as ErasedManagerConfig
    case Methods.DES_HyperNEAT:
      return {
        algorithm: DESHyperNEATAlgorithm,
        configData: {
          neat: defaultTopologyConfigOptions,
          cppn: defaultNEATConfigOptions,
        },
        genomeOptions: defaultDESHyperNEATGenomeOptions,
      } as unknown as ErasedManagerConfig
  }
}

export interface DemoOptions {
  method?: Methods
  evolutionOptions?: Partial<EvolutionOptions>
  populationOptions?: Partial<PopulationOptions>
  datasetOptions?: Partial<DatasetOptions>
  evaluation?: EvaluationConfig
  workerConfig?: WorkerConfig
}

export const demo = async (
  options: DemoOptions = {}
): Promise<Organism<AlgorithmContext> | undefined> => {
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

  const evaluationConfig =
    options.evaluation ??
    ({
      type: 'strategy',
      strategy: new IndividualStrategy(),
    } satisfies EvaluationConfig)

  const manager = new EvolutionManager({
    ...algorithmConfig(selectedMethod),
    environment,
    evaluation: evaluationConfig,
    evolutionOptions: {
      ...defaultEvolutionOptions,
      iterations: 2,
      secondsLimit: 5,
      ...options.evolutionOptions,
    },
    populationOptions: {
      ...defaultPopulationOptions,
      ...options.populationOptions,
    },
    ...(options.workerConfig != null
      ? { workerConfig: options.workerConfig }
      : {}),
  })

  const best = await manager.evolve()
  await manager.terminate()
  return best
}
