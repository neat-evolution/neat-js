import { defaultNEATConfigOptions } from '@neat-js/core'
import {
  defaultDatasetOptions,
  loadDataset,
  DatasetEnvironment,
} from '@neat-js/dataset-environment'
import { Population, defaultPopulationOptions } from '@neat-js/evolution'
import {
  type DefaultNEATGenome,
  NEATAlgorithm,
  type DefaultNEATGenomeData,
  type NEATGenomeOptions,
  defaultNEATGenomeOptions,
} from '@neat-js/neat'
import { beforeEach, describe, expect, test } from 'vitest'

import { WorkerEvaluator } from '../src/index.js'

const datasetOptions = {
  ...defaultDatasetOptions,
  dataset: new URL('./fixtures/iris-truncated', import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1,
}

const dataset = await loadDataset(datasetOptions)
const environment = new DatasetEnvironment(dataset)

describe('WorkerEvaluator', () => {
  test('should initialize correctly', () => {
    const evaluator = new WorkerEvaluator(environment, {
      createEnvironmentPathname: '@neat-js/dataset-environment',
      createExecutorPathname: '@neat-js/executor',
      taskCount: 100,
      threadCount: 4,
    })
    expect(evaluator).toBeDefined()
  })

  describe('evaluate', () => {
    let evaluator: WorkerEvaluator
    let population: Population<
      NEATGenomeOptions,
      DefaultNEATGenome,
      DefaultNEATGenomeData
    >

    beforeEach(() => {
      evaluator = new WorkerEvaluator(environment, {
        createEnvironmentPathname: '@neat-js/dataset-environment',
        createExecutorPathname: '@neat-js/executor',
        taskCount: 100,
        threadCount: 4,
      })
      population = new Population<
        NEATGenomeOptions,
        DefaultNEATGenome,
        DefaultNEATGenomeData
      >(
        evaluator,
        NEATAlgorithm.createPhenotype,
        NEATAlgorithm.createGenome,
        NEATAlgorithm.createState,
        defaultPopulationOptions,
        NEATAlgorithm.createConfig(defaultNEATConfigOptions),
        {
          ...defaultNEATGenomeOptions,
          ...evaluator.environment.description,
        }
      )
      // mutate population 100 times
      for (let i = 0; i < 100; i++) {
        population.mutate()
      }
    })

    test('should evaluate phenotypes', async () => {
      await population.evaluate()
      expect(population.best()?.fitness).toBeGreaterThan(0)
    })
  })
})
