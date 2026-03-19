import type { AlgorithmContext } from '@neat-evolution/core'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  DatasetEnvironment,
  type DatasetOptions,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import {
  defaultDESHyperNEATGenomeOptions,
  defaultTopologyConfigOptions,
} from '@neat-evolution/des-hyperneat'
import type { Organism } from '@neat-evolution/evolution'
import {
  EvolutionManager,
  type EvolutionManagerOptions,
} from '@neat-evolution/evolution-manager'

export enum Methods {
  NEAT = 'NEAT',
  CPPN = 'CPPN',
  HyperNEAT = 'HyperNEAT',
  ES_HyperNEAT = 'ES-HyperNEAT',
  DES_HyperNEAT = 'DES-HyperNEAT',
}

export const method = Methods.DES_HyperNEAT

type ErasedManagerConfig = Pick<EvolutionManagerOptions, 'algorithm'>

/** Build algorithm-specific config fields for EvolutionManagerOptions.
 *  Type-erased: each algorithm has a specific Ctx, but the demo
 *  works with all of them generically. EvolutionManager erases types internally. */
function algorithmConfig(selectedMethod: Methods): ErasedManagerConfig {
  switch (selectedMethod) {
    case Methods.NEAT:
      return { algorithm: { name: 'NEAT' } }
    case Methods.CPPN:
      return { algorithm: { name: 'CPPN' } }
    case Methods.HyperNEAT:
      return {
        algorithm: { name: 'HyperNEAT' },
      }
    case Methods.ES_HyperNEAT:
      return {
        algorithm: { name: 'ES-HyperNEAT' },
      }
    case Methods.DES_HyperNEAT:
      return {
        algorithm: {
          name: 'DES-HyperNEAT',
          configData: {
            neat: defaultTopologyConfigOptions,
            cppn: defaultNEATConfigOptions,
          } as never,
          genomeOptions: defaultDESHyperNEATGenomeOptions,
        },
      }
  }
}

type DemoAlgorithmOverrides = Partial<
  Omit<EvolutionManagerOptions['algorithm'], 'name'>
>

export interface DemoOptions {
  method?: Methods
  datasetOptions?: Partial<DatasetOptions>
  algorithm?: DemoAlgorithmOverrides
  population?: EvolutionManagerOptions['population']
  evolution?: EvolutionManagerOptions['evolution']
  evaluation?: EvolutionManagerOptions['evaluation']
  execution?: EvolutionManagerOptions['execution']
  signal?: AbortSignal
}

export const demo = async (
  options: DemoOptions = {}
): Promise<Organism<AlgorithmContext> | undefined> => {
  const {
    method: selectedMethod = method,
    datasetOptions: datasetOverrides,
    algorithm: algorithmOverrides,
    population,
    evolution,
    evaluation,
    execution,
    signal,
  } = options

  const datasetOptions: DatasetOptions = {
    ...defaultDatasetOptions,
    dataset: new URL(
      // FIXME: make dataset pathname an env variable
      '../../generated/iris',
      import.meta.url
    ).pathname,
    validationFraction: 0.1,
    testFraction: 0.1,
    ...datasetOverrides,
  }

  const dataset = await loadDataset(datasetOptions)
  const environment = new DatasetEnvironment(dataset)

  const manager = new EvolutionManager({
    algorithm: {
      ...algorithmConfig(selectedMethod).algorithm,
      ...(algorithmOverrides ?? {}),
    },
    environment: {
      config: environment,
      pathname: '@neat-evolution/dataset-environment',
    },
    evolution: {
      iterations: 20,
      secondsLimit: 5,
      ...(evolution ?? {}),
    },
    ...(population != null ? { population } : {}),
    ...(evaluation != null ? { evaluation } : {}),
    ...(execution != null ? { execution } : {}),
    ...(signal != null ? { signal } : {}),
  })

  const best = await manager.evolve()
  await manager.terminate()
  return best
}
