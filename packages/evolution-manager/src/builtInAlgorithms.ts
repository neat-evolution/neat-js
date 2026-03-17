import {
  Activation,
  defaultNEATConfigOptions,
} from '@neat-evolution/core'
import type { Phenotype } from '@neat-evolution/core'
import {
  CPPNAlgorithm,
  createConfig as createCPPNConfig,
  createGenome as createCPPNGenome,
  createPhenotype as createCPPNPhenotype,
  createState as createCPPNState,
  defaultCPPNGenomeOptions,
} from '@neat-evolution/cppn'
import {
  createConfig as createDESHyperNEATConfig,
  createGenome as createDESHyperNEATGenome,
  createPhenotype as createDESHyperNEATPhenotype,
  createState as createDESHyperNEATState,
  defaultDESHyperNEATGenomeOptions,
  DESHyperNEATAlgorithm,
} from '@neat-evolution/des-hyperneat'
import {
  createConfig as createESHyperNEATConfig,
  createGenome as createESHyperNEATGenome,
  createPhenotype as createESHyperNEATPhenotype,
  createState as createESHyperNEATState,
  defaultESHyperNEATGenomeOptions,
  ESHyperNEATAlgorithm,
} from '@neat-evolution/es-hyperneat'
import type { AnyErasedAlgorithm, AnyErasedGenome } from '@neat-evolution/evaluator'
import type { PopulationCreator } from '@neat-evolution/evolution'
import { createExecutor, type StaticExecutor } from '@neat-evolution/executor'
import {
  createConfig as createHyperNEATConfig,
  createGenome as createHyperNEATGenome,
  createPhenotype as createHyperNEATPhenotype,
  createState as createHyperNEATState,
  defaultHyperNEATGenomeOptions,
  HyperNEATAlgorithm,
} from '@neat-evolution/hyperneat'
import {
  createConfig as createNEATConfig,
  createGenome as createNEATGenome,
  createPhenotype as createNEATPhenotype,
  createState as createNEATState,
  defaultNEATGenomeOptions,
  NEATAlgorithm,
} from '@neat-evolution/neat'

export type BuiltInEvolutionAlgorithmName =
  | 'NEAT'
  | 'CPPN'
  | 'HyperNEAT'
  | 'ES-HyperNEAT'
  | 'DES-HyperNEAT'

export interface SerializedGenomeData {
  config: unknown
  state: unknown
  genomeOptions?: Record<string, unknown> | undefined
  factoryOptions?: unknown
}

type AnyPopulationAlgorithm = AnyErasedAlgorithm & PopulationCreator<any>

export interface EvolutionAlgorithmDefinition {
  name: string
  algorithm: AnyPopulationAlgorithm
  usesCPPNActivations?: boolean
  createDefaultConfigData?: () => unknown
  createDefaultGenomeOptions?: () => unknown
}

export interface BuiltInEvolutionAlgorithmDefinition
  extends EvolutionAlgorithmDefinition {
  name: BuiltInEvolutionAlgorithmName
  usesCPPNActivations: boolean
  createDefaultConfigData: () => unknown
  createDefaultGenomeOptions: () => unknown
  createGenomeFromSerialized: (
    genomeData: SerializedGenomeData,
    initConfig: unknown
  ) => AnyErasedGenome
  createPhenotypeForGenome: (genome: AnyErasedGenome) => Phenotype
}

export const ALL_CPPN_ACTIVATIONS: Activation[] = [
  Activation.Linear,
  Activation.Step,
  Activation.ReLU,
  Activation.LeakyReLU,
  Activation.ELU,
  Activation.Sigmoid,
  Activation.Swish,
  Activation.HardSigmoid,
  Activation.Tanh,
  Activation.HardTanh,
  Activation.Gaussian,
  Activation.OffsetGaussian,
  Activation.GELU,
  Activation.Square,
  Activation.Abs,
  Activation.Softsign,
  Activation.Exp,
  Activation.ClippedExp,
  Activation.Softplus,
  Activation.Mish,
]

function clonePlainData<T>(value: T): T {
  const clone = globalThis.structuredClone as
    | ((input: T) => T)
    | undefined

  if (typeof clone === 'function') {
    return clone(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

const createTypedGenomeHydrator = <G>(
  createGenome: (
    config: any,
    state: any,
    genomeOptions: any,
    initConfig: any,
    factoryOptions?: any
  ) => G,
  createConfig: (config: any) => any,
  createState: (state: any) => any
) => {
  return (genomeData: SerializedGenomeData, initConfig: unknown): G => {
    return createGenome(
      createConfig(genomeData.config),
      createState(genomeData.state),
      genomeData.genomeOptions as any,
      initConfig,
      genomeData.factoryOptions
    )
  }
}

const createTypedPhenotypeHydrator = <G>(
  createPhenotype: (genome: G) => Phenotype
) => {
  return (genome: AnyErasedGenome): Phenotype => createPhenotype(genome as G)
}

const builtInAlgorithmRegistry: Record<
  BuiltInEvolutionAlgorithmName,
  BuiltInEvolutionAlgorithmDefinition
> = {
  NEAT: {
    name: 'NEAT',
    algorithm: NEATAlgorithm,
    usesCPPNActivations: false,
    createDefaultConfigData: () => ({
      neat: clonePlainData(defaultNEATConfigOptions),
    }),
    createDefaultGenomeOptions: () => clonePlainData(defaultNEATGenomeOptions),
    createGenomeFromSerialized: createTypedGenomeHydrator(
      createNEATGenome,
      createNEATConfig,
      createNEATState
    ),
    createPhenotypeForGenome: createTypedPhenotypeHydrator(createNEATPhenotype),
  },
  CPPN: {
    name: 'CPPN',
    algorithm: CPPNAlgorithm,
    usesCPPNActivations: true,
    createDefaultConfigData: () => ({
      neat: clonePlainData(defaultNEATConfigOptions),
    }),
    createDefaultGenomeOptions: () => clonePlainData(defaultCPPNGenomeOptions),
    createGenomeFromSerialized: createTypedGenomeHydrator(
      createCPPNGenome,
      createCPPNConfig,
      createCPPNState
    ),
    createPhenotypeForGenome: createTypedPhenotypeHydrator(createCPPNPhenotype),
  },
  HyperNEAT: {
    name: 'HyperNEAT',
    algorithm: HyperNEATAlgorithm,
    usesCPPNActivations: true,
    createDefaultConfigData: () => ({
      neat: clonePlainData(defaultNEATConfigOptions),
    }),
    createDefaultGenomeOptions: () =>
      clonePlainData(defaultHyperNEATGenomeOptions),
    createGenomeFromSerialized: createTypedGenomeHydrator(
      createHyperNEATGenome,
      createHyperNEATConfig,
      createHyperNEATState
    ),
    createPhenotypeForGenome: createTypedPhenotypeHydrator(
      createHyperNEATPhenotype
    ),
  },
  'ES-HyperNEAT': {
    name: 'ES-HyperNEAT',
    algorithm: ESHyperNEATAlgorithm,
    usesCPPNActivations: true,
    createDefaultConfigData: () => ({
      neat: clonePlainData(defaultNEATConfigOptions),
    }),
    createDefaultGenomeOptions: () =>
      clonePlainData(defaultESHyperNEATGenomeOptions),
    createGenomeFromSerialized: createTypedGenomeHydrator(
      createESHyperNEATGenome,
      createESHyperNEATConfig,
      createESHyperNEATState
    ),
    createPhenotypeForGenome: createTypedPhenotypeHydrator(
      createESHyperNEATPhenotype
    ),
  },
  'DES-HyperNEAT': {
    name: 'DES-HyperNEAT',
    algorithm: DESHyperNEATAlgorithm,
    usesCPPNActivations: true,
    createDefaultConfigData: () => ({
      cppn: clonePlainData(defaultNEATConfigOptions),
    }),
    createDefaultGenomeOptions: () =>
      clonePlainData(defaultDESHyperNEATGenomeOptions),
    createGenomeFromSerialized: createTypedGenomeHydrator(
      createDESHyperNEATGenome,
      createDESHyperNEATConfig,
      createDESHyperNEATState
    ),
    createPhenotypeForGenome: createTypedPhenotypeHydrator(
      createDESHyperNEATPhenotype
    ),
  },
}

export const SUPPORTED_EVOLUTION_ALGORITHMS: BuiltInEvolutionAlgorithmName[] = [
  'NEAT',
  'CPPN',
  'HyperNEAT',
  'ES-HyperNEAT',
  'DES-HyperNEAT',
]

export function getBuiltInEvolutionAlgorithmDefinition(
  name: BuiltInEvolutionAlgorithmName
): BuiltInEvolutionAlgorithmDefinition {
  return builtInAlgorithmRegistry[name]
}

export function getBuiltInEvolutionAlgorithmDefinitions(): ReadonlyArray<BuiltInEvolutionAlgorithmDefinition> {
  return SUPPORTED_EVOLUTION_ALGORITHMS.map(
    (name) => builtInAlgorithmRegistry[name]
  )
}

export function createBuiltInGenomeFromSerialized(
  name: BuiltInEvolutionAlgorithmName,
  genomeData: SerializedGenomeData,
  initConfig: unknown
): AnyErasedGenome {
  return getBuiltInEvolutionAlgorithmDefinition(name).createGenomeFromSerialized(
    genomeData,
    initConfig
  )
}

export function createBuiltInPhenotypeForGenome(
  name: BuiltInEvolutionAlgorithmName,
  genome: AnyErasedGenome
): Phenotype {
  return getBuiltInEvolutionAlgorithmDefinition(name).createPhenotypeForGenome(
    genome
  )
}

export function createBuiltInExecutorFromSerializedGenome(
  name: BuiltInEvolutionAlgorithmName,
  genomeData: SerializedGenomeData,
  initConfig: unknown
): StaticExecutor {
  const genome = createBuiltInGenomeFromSerialized(name, genomeData, initConfig)
  const phenotype = createBuiltInPhenotypeForGenome(name, genome)
  return createExecutor(phenotype)
}
