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

  test('should load a mnist dataset from a file', async () => {
    const options = defaultDatasetOptions
    options.dataset = new URL(
      './fixtures/mnist-truncated',
      import.meta.url
    ).pathname
    const data = await loadDataset(options)
    expect(data.dimensions.inputs).toBe(64)
    expect(data.dimensions.outputs).toBe(10)
    expect(data.isClassification).toBe(true)
    expect(data.oneHotOutput).toBe(true)
    expect(data.trainingInputs.length).toBe(8)
    expect(data.trainingTargets.length).toBe(8)
    expect(data.validationInputs.length).toBe(1)
    expect(data.validationTargets.length).toBe(1)
    expect(data.testInputs.length).toBe(1)
    expect(data.testTargets.length).toBe(1)
    expect(data.totalCount).toBe(10)
    expect(data.trainingCount).toBe(8)
    expect(data.validationCount).toBe(1)
    expect(data.testCount).toBe(1)
  })
  test('should load a retina dataset from a file', async () => {
    const options = defaultDatasetOptions
    options.dataset = new URL(
      './fixtures/retina-truncated',
      import.meta.url
    ).pathname
    const data = await loadDataset(options)
    expect(data.dimensions.inputs).toBe(8)
    expect(data.dimensions.outputs).toBe(2)
    expect(data.isClassification).toBe(true)
    expect(data.oneHotOutput).toBe(false)
    expect(data.trainingInputs.length).toBe(8)
    expect(data.trainingTargets.length).toBe(8)
    expect(data.validationInputs.length).toBe(1)
    expect(data.validationTargets.length).toBe(1)
    expect(data.testInputs.length).toBe(1)
    expect(data.testTargets.length).toBe(1)
    expect(data.totalCount).toBe(10)
    expect(data.trainingCount).toBe(8)
    expect(data.validationCount).toBe(1)
    expect(data.testCount).toBe(1)
  })
  test('should load a wine dataset from a file', async () => {
    const options = defaultDatasetOptions
    options.dataset = new URL(
      './fixtures/wine-truncated',
      import.meta.url
    ).pathname
    const data = await loadDataset(options)
    expect(data.dimensions.inputs).toBe(13)
    expect(data.dimensions.outputs).toBe(3)
    expect(data.isClassification).toBe(true)
    expect(data.oneHotOutput).toBe(true)
    expect(data.trainingInputs.length).toBe(8)
    expect(data.trainingTargets.length).toBe(8)
    expect(data.validationInputs.length).toBe(1)
    expect(data.validationTargets.length).toBe(1)
    expect(data.testInputs.length).toBe(1)
    expect(data.testTargets.length).toBe(1)
    expect(data.totalCount).toBe(10)
    expect(data.trainingCount).toBe(8)
    expect(data.validationCount).toBe(1)
    expect(data.testCount).toBe(1)
  })
  test('should fail to load a mismatched dataset from a file', async () => {
    const options = defaultDatasetOptions
    options.dataset = new URL('./fixtures/mismatched', import.meta.url).pathname
    let error: any
    try {
      await loadDataset(options)
    } catch (err) {
      error = err
    }
    expect(error.message).toBe('Unable to load dataset')
  })

  test('should add bias input', async () => {
    const options = defaultDatasetOptions
    options.dataset = new URL(
      './fixtures/mnist-truncated',
      import.meta.url
    ).pathname
    options.addBiasInput = true
    const data = await loadDataset(options)
    expect(data.dimensions.inputs).toBe(65)
  })
})
