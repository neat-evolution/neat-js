import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-js/dataset-environment'
import type { EvaluatorFactory } from '@neat-js/evaluator'
import {
  defaultEvolutionOptions,
  type EvolutionOptions,
} from '@neat-js/evolution'
import { neat } from '@neat-js/neat'

export const demo = async (createEvaluator: EvaluatorFactory<null>) => {
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
  const evaluator = createEvaluator(environment, null)

  const evolutionOptions: EvolutionOptions = {
    ...defaultEvolutionOptions,
    iterations: 500,
    secondsLimit: 60,
  }
  const best = await neat(evaluator, evolutionOptions)
  return best
}
