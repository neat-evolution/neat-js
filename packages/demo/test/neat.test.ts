import { NEATConfig } from '@neat-js/core'
import {
  defaultDatasetConfig,
  DatasetEnvironment,
  loadDataset,
} from '@neat-js/dataset-environment'
import { AsyncEvaluator } from '@neat-js/evaluator'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-js/evolution'
import { createExecutor } from '@neat-js/executor'
import { neat, defaultNEATGenomeOptions } from '@neat-js/neat'
import { describe, expect, test } from 'vitest'

describe.skip('neat', () => {
  test.skip('should evolve a genome', async () => {
    const datasetOptions = defaultDatasetConfig
    datasetOptions.dataset = new URL(
      './fixtures/iris-truncated',
      import.meta.url
    ).pathname
    datasetOptions.validationFraction = 0.1
    datasetOptions.testFraction = 0.1

    const dataset = await loadDataset(datasetOptions)
    const environment = new DatasetEnvironment(dataset)
    const evaluator = new AsyncEvaluator(environment, createExecutor)

    const evolutionOptions = defaultEvolutionOptions
    evolutionOptions.secondsLimit = 180

    const NEATOptions = new NEATConfig()
    const populationOptions = defaultPopulationOptions
    const genomeOptions = defaultNEATGenomeOptions

    const genome = await neat(
      evaluator,
      evolutionOptions,
      NEATOptions,
      populationOptions,
      genomeOptions
    )

    const genomeData = JSON.stringify(genome)
    console.log(genomeData)

    expect(1).toBe(1)
  })
})
