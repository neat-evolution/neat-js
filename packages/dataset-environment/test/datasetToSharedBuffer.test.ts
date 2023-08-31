import { beforeEach, describe, expect, test } from 'vitest'

import { datasetFromSharedBuffer } from '../src/datasetFromSharedBuffer.js'
import { datasetToSharedBuffer } from '../src/datasetToSharedBuffer.js'
import {
  defaultDatasetOptions,
  type Dataset,
  loadDataset,
} from '../src/index.js'

const options = {
  ...defaultDatasetOptions,
  validationFraction: 0.1,
  testFraction: 0.1,
}
options.dataset = new URL('./fixtures/iris-truncated', import.meta.url).pathname

describe('datasetToSharedBuffer', () => {
  let dataset: Dataset
  beforeEach(async () => {
    dataset = await loadDataset(options)
  })

  test('should convert a dataset to a SharedArrayBuffer', () => {
    const sharedBuffer = datasetToSharedBuffer(dataset)
    const restoredDataset = datasetFromSharedBuffer(sharedBuffer)
    expect(restoredDataset).toEqual(dataset)
  })
})
