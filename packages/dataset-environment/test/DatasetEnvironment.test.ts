import type { Executor, SyncExecutor } from '@neat-evolution/executor'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import {
  DatasetEnvironment,
  datasetFromSharedBuffer,
  defaultDatasetOptions,
  loadDataset,
} from '../src/index.js'
import type { Dataset, DatasetOptions } from '../src/index.js'

describe('DatasetEnvironment', () => {
  test('should create a DatasetEnvironment', async () => {
    const options = {
      ...defaultDatasetOptions,
      validationFraction: 0.1,
      testFraction: 0.1,
      dataset: new URL('./fixtures/iris-truncated', import.meta.url).pathname,
    }
    const dataset = await loadDataset(options)
    const environment = new DatasetEnvironment(dataset)
    expect(environment).toBeDefined()
  })

  describe('DatasetEnvironment.toSharedBuffer', () => {
    let options: DatasetOptions
    let dataset: Dataset
    let environment: DatasetEnvironment
    beforeEach(async () => {
      options = {
        ...defaultDatasetOptions,
        validationFraction: 0.1,
        testFraction: 0.1,
        dataset: new URL('./fixtures/iris-truncated', import.meta.url).pathname,
      }
      dataset = await loadDataset(options)
      environment = new DatasetEnvironment(dataset)
    })

    test('should convert a dataset to a SharedArrayBuffer', () => {
      const sharedBuffer = environment.toFactoryOptions()
      const restoredDataset = datasetFromSharedBuffer(sharedBuffer)
      expect(restoredDataset).toEqual(dataset)
    })
  })

  describe('batch evaluation', () => {
    let environment: DatasetEnvironment
    let executors: SyncExecutor[]
    let asyncExecutors: Executor[]

    beforeEach(async () => {
      const mockDataset: Dataset = {
        name: 'mock-dataset',
        description: 'A mock dataset for testing',
        dimensions: { inputs: 1, outputs: 3 },
        isClassification: true,
        oneHotOutput: true,
        trainingInputs: [[1]],
        trainingTargets: [[0, 1, 0]], // Target for perfect prediction
        validationInputs: [],
        validationTargets: [],
        testInputs: [],
        testTargets: [],
      }
      environment = new DatasetEnvironment(mockDataset)

      const numTrainingInputs = environment.dataset.trainingInputs.length
      const perfectPrediction = [0.01, 0.98, 0.01] // Close to target [0, 1, 0]
      const predictions = Array(numTrainingInputs)
        .fill(null)
        .map(() => [...perfectPrediction])

      executors = [
        { executeBatch: vi.fn().mockImplementation(() => predictions) },
        { executeBatch: vi.fn().mockImplementation(() => predictions) },
      ] as unknown as SyncExecutor[]

      asyncExecutors = [
        {
          executeBatch: vi.fn().mockImplementation(async () => predictions),
          isAsync: true,
        },
        {
          executeBatch: vi.fn().mockImplementation(async () => predictions),
          isAsync: true,
        },
      ] as unknown as Executor[]
    })

    test('evaluateBatch should return fitness for multiple executors', () => {
      const fitnessScores = environment.evaluateBatch(executors)
      expect(fitnessScores).toHaveLength(2)
      expect(fitnessScores[0]).toBeCloseTo(0.98, 2)
      expect(fitnessScores[1]).toBeCloseTo(0.98, 2)
    })

    test('evaluateBatchAsync should return fitness for multiple async executors', async () => {
      const fitnessScores = await environment.evaluateBatchAsync(asyncExecutors)
      expect(fitnessScores).toHaveLength(2)
      expect(fitnessScores[0]).toBeCloseTo(0.98, 2)
      expect(fitnessScores[1]).toBeCloseTo(0.98, 2)
    })
  })
})
