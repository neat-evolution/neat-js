import type { Organism } from '@neat-js/evolution'
import { createExecutor as createVanillaExecutor } from '@neat-js/executor'
import { type DefaultNEATGenome, createPhenotype } from '@neat-js/neat'
import type { Phenotype } from '@neat-js/phenotype'
import * as tf from '@tensorflow/tfjs-node'
import { beforeEach, describe, expect, test } from 'vitest'

import { PhenotypeLayer } from '../src/index.js'

import { createOrganism } from './fixtures/organisms.js'

describe('PhenotypeLayer', () => {
  let organism: Organism<DefaultNEATGenome>
  let phenotype: Phenotype
  let phenotypeLayer: PhenotypeLayer

  beforeEach(() => {
    organism = createOrganism()
    phenotype = createPhenotype(organism.genome)
    phenotypeLayer = new PhenotypeLayer(phenotype)
  })

  test('should support batch processing', async () => {
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
    const vanillaExecutor = createVanillaExecutor(phenotype, data.length)

    const inputTensor = tf.tensor2d(data, [data.length, 4], 'float32')
    // Apply the phenotype layer
    const outputTensor = phenotypeLayer.apply(inputTensor) as tf.Tensor

    // Convert the output tensor to a JavaScript array
    const batchOutputs = (await outputTensor.array()) as number[][]

    // Free up memory
    tf.dispose([inputTensor, outputTensor])

    // Since batch size is 1, outputs is a 2D array with one element; use flat() to make it 1D
    expect(batchOutputs).toBeDefined()
    expect(batchOutputs).toHaveLength(data.length)

    const vanillaOutputs = await vanillaExecutor(data)

    for (const [i, output] of batchOutputs.entries()) {
      for (const [j, o] of output.entries()) {
        expect(o).toBeCloseTo(vanillaOutputs[i]?.[j] as number)
      }
    }
  })

  test.skip('should tf.profile', async () => {
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
    const profile = await tf.profile(async () => {
      const inputTensor = tf.tensor2d(
        data,
        [data.length, (data[0] as number[]).length],
        'float32'
      )
      const outputTensor = phenotypeLayer.apply(inputTensor) as tf.Tensor
      // const batchOutputs = (await outputTensor.array()) as number[][]
      tf.dispose([inputTensor, outputTensor])
    })
    expect(JSON.stringify(profile, null, 2)).toBe(data.length)
  })
})
