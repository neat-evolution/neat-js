import { createExecutor as createVanillaExecutor } from '@neat-js/executor'
import { describe, expect, test } from 'vitest'

import { createExecutor } from '../src/index.js'

import { phenotype } from './fixtures/phenotype.js'

describe('createExecutor', () => {
  test('should correctly create an executor', () => {
    const executor = createExecutor(phenotype, 1)
    expect(executor).toBeDefined()
  })

  test('should correctly execute the phenotype', async () => {
    const data = [
      [5.1, 3.5, 1.4, 0.2],
      [4.9, 3.0, 1.4, 0.2],
      [4.7, 3.2, 1.3, 0.2],
      [4.6, 3.1, 1.5, 0.2],
      [5.0, 3.6, 1.4, 0.2],
      [5.4, 3.9, 1.7, 0.4],
      [4.6, 3.4, 1.4, 0.3],
      [5.0, 3.4, 1.5, 0.2],
      [4.4, 2.9, 1.4, 0.2],
      [4.9, 3.1, 1.5, 0.1],
    ]
    const executor = createExecutor(phenotype, data.length)
    const outputs = await executor(data)

    expect(outputs).toBeDefined()
    expect(outputs).toHaveLength(data.length)
    expect(outputs[0]).toHaveLength(3)
  })
  test('should match the output of the vanilla executor', async () => {
    const data = [
      [5.1, 3.5, 1.4, 0.2],
      [4.9, 3.0, 1.4, 0.2],
      [4.7, 3.2, 1.3, 0.2],
      [4.6, 3.1, 1.5, 0.2],
      [5.0, 3.6, 1.4, 0.2],
      [5.4, 3.9, 1.7, 0.4],
      [4.6, 3.4, 1.4, 0.3],
      [5.0, 3.4, 1.5, 0.2],
      [4.4, 2.9, 1.4, 0.2],
      [4.9, 3.1, 1.5, 0.1],
    ]
    const executor = createExecutor(phenotype, data.length)
    const vanillaExecutor = createVanillaExecutor(phenotype, data.length)

    const outputs = await executor(data)
    const vanillaOutputs = await vanillaExecutor(data)

    expect(outputs).toBeDefined()
    for (const [i, output] of outputs.entries()) {
      for (const [j, o] of output.entries()) {
        expect(o).toBeCloseTo(vanillaOutputs[i]?.[j] as number)
      }
    }
  })
})
