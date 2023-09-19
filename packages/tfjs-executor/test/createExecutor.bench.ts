import { createExecutor as createVanillaExecutor } from '@neat-js/executor'
import { createExecutor as createGPUJSExecutor } from '@neat-js/gpujs-executor'
import { createPhenotype } from '@neat-js/neat'
import * as tf from '@tensorflow/tfjs-node'
import { bench, describe, expect } from 'vitest'

import { createExecutor, PhenotypeLayer } from '../src/index.js'

import { data } from './fixtures/irisInputs.js'
import { createOrganism } from './fixtures/organisms.js'

const organism = createOrganism()
const phenotype = createPhenotype(organism.genome)

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
    // Apply the phenotype layer
    const outputTensor = phenotypeLayer.apply(inputTensor) as tf.Tensor

    // Convert the output tensor to a JavaScript array
    const outputs = (await outputTensor.array()) as number[][]

    // Free up memory
    tf.dispose([inputTensor, outputTensor])

    // Since batch size is 1, outputs is a 2D array with one element; use flat() to make it 1D
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
