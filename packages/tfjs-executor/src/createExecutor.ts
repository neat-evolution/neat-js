import { type Phenotype } from '@neat-js/core'
import type { Executor, ExecutorFactory } from '@neat-js/executor'
import * as tf from '@tensorflow/tfjs-node'
import '@tensorflow/tfjs-backend-wasm'

import { PhenotypeLayer } from './PhenotypeLayer.js'

await tf.setBackend('wasm')
await tf.ready()

export const createExecutor: ExecutorFactory = (
  phenotype: Phenotype,
  batchSize: number
): Executor => {
  const phenotypeLayer = new PhenotypeLayer(phenotype)

  return async (batch: number[][]) => {
    const inputTensor = tf.tensor2d(
      batch,
      [batchSize, phenotype.inputs.length],
      'float32'
    )
    const outputTensor = phenotypeLayer.apply(inputTensor) as tf.Tensor
    const outputs = (await outputTensor.array()) as number[][]
    tf.dispose([inputTensor, outputTensor])
    return outputs
  }
}
