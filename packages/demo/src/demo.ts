import { defaultNEATConfigOptions } from '@neat-js/core'
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
} from '@neat-js/evolution'
import {
  defaultNEATGenomeOptions,
  neat,
  NEATAlgorithm,
  type NEATReproducerFactory,
} from '@neat-js/neat'

export const demo = async (
  createReproducer: NEATReproducerFactory<undefined>,
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
  const evaluator = createEvaluator(NEATAlgorithm, environment, null)

  const evolutionOptions: EvolutionOptions = {
    ...defaultEvolutionOptions,
    iterations: 5_000,
    secondsLimit: 600,
  }
  const best = await neat(
    createReproducer,
    evaluator,
    evolutionOptions,
    defaultNEATConfigOptions,
    defaultPopulationOptions,
    undefined,
    defaultNEATGenomeOptions
  )
  return best
}
