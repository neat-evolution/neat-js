import { beforeEach, describe, expect, test } from 'vitest'

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
      const sharedBuffer = environment.serialize()
      const restoredDataset = datasetFromSharedBuffer(sharedBuffer)
      expect(restoredDataset).toEqual(dataset)
    })
  })
})
