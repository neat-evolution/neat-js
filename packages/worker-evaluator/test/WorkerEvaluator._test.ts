/**
 * @vitest-environment jsdom
 */
import '@vitest/web-worker'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  defaultDatasetOptions,
  loadDataset,
  DatasetEnvironment,
} from '@neat-evolution/dataset-environment'
import {
  Population,
  createReproducer,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import {
  type DefaultNEATGenome,
  NEATAlgorithm,
  type DefaultNEATGenomeData,
  type NEATGenomeOptions,
  defaultNEATGenomeOptions,
  type NEATNode,
  type NEATLink,
  type NEATConfig,
  type NEATState,
  type DefaultNEATGenomeFactoryOptions,
  createConfig,
} from '@neat-evolution/neat'
import { beforeEach, describe, expect, test } from 'vitest'

import { WorkerEvaluator } from '../src/index.js'

const root = __dirname
const datasetOptions = {
  ...defaultDatasetOptions,
  dataset: `${root}/fixtures/iris-truncated`,
  validationFraction: 0.1,
  testFraction: 0.1,
}

const dataset = await loadDataset(datasetOptions)
const environment = new DatasetEnvironment(dataset)

type NeatPopulation = Population<
  NEATNode,
  NEATLink,
  NEATConfig,
  NEATState,
  NEATGenomeOptions,
  DefaultNEATGenomeFactoryOptions,
  DefaultNEATGenomeData,
  DefaultNEATGenome,
  typeof NEATAlgorithm,
  undefined
>

const foo = import.meta.glob('@neat-evolution/dataset-environment', {
  import: 'createEnvironment',
  eager: true,
})
const bar = import.meta.glob('@neat-evolution/executor', {
  import: 'createExecutor',
  eager: true,
})

describe.skip('WorkerEvaluator', () => {
  test('should initialize correctly', () => {
    const evaluator = new WorkerEvaluator(NEATAlgorithm, environment, {
      createEnvironmentPathname: foo['@neat-evolution/dataset-environment'],
      createExecutorPathname: bar['@neat-evolution/executor'],
      taskCount: 100,
      threadCount: 4,
    })
    expect(evaluator).toBeDefined()
  })

  describe.skip('evaluate', () => {
    let evaluator: WorkerEvaluator
    let population: NeatPopulation

    beforeEach(() => {
      evaluator = new WorkerEvaluator(NEATAlgorithm, environment, {
        createEnvironmentPathname: '@neat-evolution/dataset-environment',
        createExecutorPathname: '@neat-evolution/executor',
        taskCount: 100,
        threadCount: 4,
      })

      const configProvider = createConfig(defaultNEATConfigOptions)
      const genomeOptions = {
        ...defaultNEATGenomeOptions,
        ...evaluator.environment.description,
      }
      const populationOptions = {
        ...defaultPopulationOptions,
        populationSize: 1,
      }
      population = new Population(
        createReproducer,
        evaluator,
        NEATAlgorithm,
        configProvider,
        populationOptions,
        undefined,
        genomeOptions
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
