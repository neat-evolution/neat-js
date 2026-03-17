import type {
  Algorithm,
  AlgorithmContext,
  ConfigDataOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  LinkDataOf,
  NodeHiddenDataOf,
  StateDataOf,
} from '@neat-evolution/core'
import type { EnvironmentConfig } from '@neat-evolution/environment'
import type { EvaluationStrategy } from '@neat-evolution/evaluation-strategy'
import type { RuntimeConfig } from '@neat-evolution/evaluator'
import type {
  EvolutionOptions,
  PopulationCreator,
  PopulationFactoryOptions,
  PopulationOptions,
} from '@neat-evolution/evolution'
import type { StatsRecorder } from '@neat-evolution/stats'

import {
  type BuiltInEvolutionAlgorithmName,
  type EvolutionAlgorithmDefinition,
  getBuiltInEvolutionAlgorithmDefinition,
} from './builtInAlgorithms.js'

export interface EvaluatorConfig extends RuntimeConfig {
  algorithmPathname?: string
  threadCount?: number
  taskCount?: number
  evaluatorWorkerScriptUrl?: URL | string
  reproducerWorkerScriptUrl?: URL | string
  verbose?: boolean
}

export interface EvolutionManagerAlgorithmOptions<
  Ctx extends AlgorithmContext = AlgorithmContext,
> {
  name?: BuiltInEvolutionAlgorithmName
  definition?: EvolutionAlgorithmDefinition
  algorithm?: Algorithm<Ctx> & PopulationCreator<Ctx>
  configData?: ConfigDataOf<Ctx>
  genomeOptions?: GenomeOptionsOf<Ctx>
}

export interface EvolutionManagerEnvironmentOptions {
  config: EnvironmentConfig
  pathname: string
}

export interface EvolutionManagerPopulationOptions<
  Ctx extends AlgorithmContext = AlgorithmContext,
> {
  options?: Partial<PopulationOptions>
  factoryOptions?: PopulationFactoryOptions<
    ConfigDataOf<Ctx>,
    StateDataOf<Ctx>,
    NodeHiddenDataOf<Ctx>,
    LinkDataOf<Ctx>,
    GenomeFactoryOptionsOf<Ctx>,
    GenomeOptionsOf<Ctx>
  >
}

export interface EvolutionManagerEvolutionOptions
  extends Partial<EvolutionOptions> {}

export interface EvolutionManagerEvaluationOptions {
  strategy?: EvaluationStrategy
  options?: EvaluatorConfig
  stats?: StatsRecorder
}

export interface EvolutionManagerExecutionOptions {
  createExecutionManager?: string
  executionManagerFactoryOptions?: Record<string, unknown>
}

export interface EvolutionManagerOptions<
  Ctx extends AlgorithmContext = AlgorithmContext,
> {
  algorithm: EvolutionManagerAlgorithmOptions<Ctx>
  environment: EvolutionManagerEnvironmentOptions
  population?: EvolutionManagerPopulationOptions<Ctx>
  evolution?: EvolutionManagerEvolutionOptions
  evaluation?: EvolutionManagerEvaluationOptions
  execution?: EvolutionManagerExecutionOptions
  signal?: AbortSignal
}

export interface NormalizedEvolutionManagerConfig<
  Ctx extends AlgorithmContext = AlgorithmContext,
> {
  algorithm: Algorithm<Ctx> & PopulationCreator<Ctx>
  environment: EnvironmentConfig
  createEnvironmentPathname: string
  strategy?: EvaluationStrategy
  evolutionOptions?: Partial<EvolutionOptions>
  populationOptions?: Partial<PopulationOptions>
  configData?: ConfigDataOf<Ctx>
  genomeOptions?: GenomeOptionsOf<Ctx>
  populationFactoryOptions?: PopulationFactoryOptions<
    ConfigDataOf<Ctx>,
    StateDataOf<Ctx>,
    NodeHiddenDataOf<Ctx>,
    LinkDataOf<Ctx>,
    GenomeFactoryOptionsOf<Ctx>,
    GenomeOptionsOf<Ctx>
  >
  evaluatorConfig?: EvaluatorConfig
  stats?: StatsRecorder
  signal?: AbortSignal
}

function mergeEvaluatorConfig(
  evaluationOptions: EvaluatorConfig | undefined,
  executionOptions: EvolutionManagerExecutionOptions | undefined
): EvaluatorConfig | undefined {
  if (evaluationOptions == null && executionOptions == null) {
    return undefined
  }

  const hydrateEnvironmentOptions =
    evaluationOptions?.hydrateEnvironmentOptions != null
      ? { ...evaluationOptions.hydrateEnvironmentOptions }
      : {}
  const environmentRuntimeData =
    evaluationOptions?.environmentRuntimeData != null
      ? { ...evaluationOptions.environmentRuntimeData }
      : {}

  if (executionOptions?.createExecutionManager != null) {
    hydrateEnvironmentOptions.createExecutionManager =
      executionOptions.createExecutionManager
  }
  if (executionOptions?.executionManagerFactoryOptions != null) {
    environmentRuntimeData.executionManagerFactoryOptions =
      executionOptions.executionManagerFactoryOptions
  }

  return {
    ...(evaluationOptions ?? {}),
    ...(Object.keys(hydrateEnvironmentOptions).length > 0
      ? { hydrateEnvironmentOptions }
      : {}),
    ...(Object.keys(environmentRuntimeData).length > 0
      ? { environmentRuntimeData }
      : {}),
  }
}

function resolveAlgorithmDefinition<
  Ctx extends AlgorithmContext = AlgorithmContext,
>(
  options: EvolutionManagerAlgorithmOptions<Ctx>
): EvolutionAlgorithmDefinition | undefined {
  if (options.definition != null) {
    return options.definition
  }
  if (options.name != null) {
    return getBuiltInEvolutionAlgorithmDefinition(options.name)
  }
  return undefined
}

function resolveAlgorithm<Ctx extends AlgorithmContext = AlgorithmContext>(
  options: EvolutionManagerAlgorithmOptions<Ctx>
): Algorithm<Ctx> & PopulationCreator<Ctx> {
  const definition = resolveAlgorithmDefinition(options)
  const algorithm =
    options.algorithm ??
    (definition?.algorithm as
      | (Algorithm<Ctx> & PopulationCreator<Ctx>)
      | undefined)

  if (algorithm == null) {
    throw new Error('EvolutionManager requires an algorithm')
  }

  return algorithm
}

export function createEvolutionManagerConfig<
  Ctx extends AlgorithmContext = AlgorithmContext,
>(
  config: EvolutionManagerOptions<Ctx>
): NormalizedEvolutionManagerConfig<Ctx> {
  if (config.algorithm == null) {
    throw new Error('EvolutionManager requires an algorithm')
  }
  if (config.environment == null) {
    throw new Error('EvolutionManager requires an environment')
  }

  const algorithmDefinition = resolveAlgorithmDefinition(config.algorithm)
  const algorithm = resolveAlgorithm(config.algorithm)
  const environment = config.environment.config
  const evaluatorConfig = mergeEvaluatorConfig(
    config.evaluation?.options,
    config.execution
  )

  if (environment == null) {
    throw new Error('EvolutionManager requires an environment')
  }

  return {
    algorithm,
    ...(config.algorithm.configData != null ||
    algorithmDefinition?.createDefaultConfigData != null
      ? {
          configData: (config.algorithm.configData ??
            algorithmDefinition?.createDefaultConfigData?.()) as ConfigDataOf<Ctx>,
        }
      : {}),
    ...(config.algorithm.genomeOptions != null ||
    algorithmDefinition?.createDefaultGenomeOptions != null
      ? {
          genomeOptions: (config.algorithm.genomeOptions ??
            algorithmDefinition?.createDefaultGenomeOptions?.() ??
            algorithm.defaultOptions) as GenomeOptionsOf<Ctx>,
        }
      : {}),
    environment,
    createEnvironmentPathname: config.environment.pathname,
    ...(config.evaluation?.strategy != null
      ? { strategy: config.evaluation.strategy }
      : {}),
    ...(evaluatorConfig != null ? { evaluatorConfig } : {}),
    ...(config.evolution != null ? { evolutionOptions: config.evolution } : {}),
    ...(config.population?.options != null
      ? { populationOptions: config.population.options }
      : {}),
    ...(config.population?.factoryOptions != null
      ? { populationFactoryOptions: config.population.factoryOptions }
      : {}),
    ...(config.evaluation?.stats != null
      ? { stats: config.evaluation.stats }
      : {}),
    ...(config.signal != null ? { signal: config.signal } : {}),
  }
}
