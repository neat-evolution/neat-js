import { describe, expect, test } from 'vitest'

import { defaultDatasetConfig } from '../src/dataset-environment/DatasetConfig.js'
import { loadDataset } from '../src/dataset-environment/loadDataset.js'

import { dataset } from './fixtures/irisTruncatedDataset.js'

describe('loadDataset', () => {
  test('should load a dataset from a file', async () => {
    const options = defaultDatasetConfig
    options.dataset = new URL(
      './fixtures/iris-truncated',
      import.meta.url
    ).pathname
    const data = await loadDataset(options)
    expect(data).toEqual(dataset)
  })
})
