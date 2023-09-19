import { createExecutor as createVanillaExecutor } from '@neat-js/executor'
import { createExecutor as createGPUJSExecutor } from '@neat-js/gpujs-executor'
import * as tf from '@tensorflow/tfjs-node'
import { bench, describe, expect } from 'vitest'

import { createExecutor, PhenotypeLayer } from '../src/index.js'

import { data } from './fixtures/irisInputs.js'
import { phenotype } from './fixtures/phenotype.js'

const executor = createExecutor(phenotype, data.length)
const gpujsExecutor = createGPUJSExecutor(phenotype, data.length)
const phenotypeLayer = new PhenotypeLayer(phenotype)
const vanillaExecutor = createVanillaExecutor(phenotype, data.length)

describe('createExecutor', () => {
  bench('tfjs executor', async () => {
    const outputs = await executor(data)
    expect(outputs).toBeDefined()
    expect(outputs).toHaveLength(data.length)
    expect(outputs[0]).toHaveLength(3)
  })

  bench('gpujs executor', async () => {
    const outputs = await gpujsExecutor(data)
    expect(outputs).toBeDefined()
    expect(outputs).toHaveLength(data.length)
    expect(outputs[0]).toHaveLength(3)
  })

  bench('PhenotypeLayer', async () => {
    const inputTensor = tf.tensor2d(data, [data.length, 4], 'float32')
    const outputTensor = phenotypeLayer.apply(inputTensor) as tf.Tensor
    const outputs = (await outputTensor.array()) as number[][]
    tf.dispose([inputTensor, outputTensor])

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
