import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-js/dataset-environment'
import { createExecutor } from '@neat-js/executor'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createPhenotype } from '../src/createPhenotype.js'
import type { NEATGenome } from '../src/NEATGenome.js'

import { testCases } from './fixtures/fitness/testCases.js'

vi.mock('@neat-js/utils', async () => {
  const actual: any = await vi.importActual('@neat-js/utils')
  return {
    ...actual,
    shuffle: vi.fn((array) => array),
  }
})

// Restore the original implementation of shuffle after the test
// ;(shuffle as jest.Mock).mockRestore()
const formattedTestCases = testCases.map(({ name, fitness, genome }) => [
  name,
  genome,
  fitness,
]) as Array<[name: string, a: NEATGenome, expected: number]>

describe('Genome fitness fixtures', () => {
  const datasetOptions = defaultDatasetOptions
  datasetOptions.dataset = new URL(
    // FIXME: make dataset pathname an env variable
    './fixtures/iris',
    import.meta.url
  ).pathname
  datasetOptions.validationFraction = 0.1
  datasetOptions.testFraction = 0.1
  let environment: DatasetEnvironment

  beforeEach(async () => {
    const dataset = await loadDataset(datasetOptions)
    environment = new DatasetEnvironment(dataset)
  })

  test.each(formattedTestCases)(
    '%s',
    async (name: string, a: NEATGenome, expected: number) => {
      const phenotype = createPhenotype(a)
      const executor = createExecutor(phenotype, environment.batchSize)
      const fitness = await environment.evaluate(executor)
      expect(fitness).toBe(expected)
    }
  )
})
