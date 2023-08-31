import { describe, expect, test } from 'vitest'

import { defaultDatasetOptions } from '../src/DatasetOptions.js'
import { loadDataset } from '../src/loadDataset.js'

import { dataset } from './fixtures/irisTruncatedDataset.js'

describe('loadDataset', () => {
  test('should load a dataset from a file', async () => {
    const options = defaultDatasetOptions
    options.dataset = new URL(
      './fixtures/iris-truncated',
      import.meta.url
    ).pathname
    const data = await loadDataset(options)
    expect(data).toEqual(dataset)
  })
})
