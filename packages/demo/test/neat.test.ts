import { describe, expect, test } from 'vitest'

import { NEATConfig } from '../src/core/NEATConfig.js'
import { defaultDatasetConfig } from '../src/dataset-environment/DatasetConfig.js'
import { DatasetEnvironment } from '../src/dataset-environment/DatasetEnvironment.js'
import { loadDataset } from '../src/dataset-environment/loadDataset.js'
import { AsyncEvaluator } from '../src/evaluator/AsyncEvaluator.js'
import { defaultEvolutionOptions } from '../src/evolution/EvolutionOptions.js'
import { defaultPopulationOptions } from '../src/evolution/PopulationOptions.js'
import { createExecutor } from '../src/executor/createExecutor.js'
import { neat } from '../src/neat/index.js'
import { defaultNEATGenomeOptions } from '../src/neat/NEATGenomeOptions.js'

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
