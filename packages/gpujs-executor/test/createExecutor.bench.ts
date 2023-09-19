import { createExecutor as createVanillaExecutor } from '@neat-js/executor'
import { bench, describe, expect } from 'vitest'

import { createExecutor } from '../src/index.js'

import { data } from './fixtures/irisInputs.js'
import { phenotype } from './fixtures/phenotype.js'

const executor = createExecutor(phenotype, data.length)
const vanillaExecutor = createVanillaExecutor(phenotype, data.length)

describe('createExecutor', () => {
  bench('gpujs executor', async () => {
    const outputs = await executor(data)
    expect(outputs).toBeDefined()
    expect(outputs).toHaveLength(data.length)
    expect(outputs[0]).toHaveLength(3)
  })

  bench('vanilla executor', async () => {
    const outputs = await vanillaExecutor(data)
    expect(outputs).toBeDefined()
    expect(outputs).toHaveLength(data.length)
    expect(outputs[0]).toHaveLength(3)
  })
})
