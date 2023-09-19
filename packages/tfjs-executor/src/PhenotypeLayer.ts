import { type Phenotype, PhenotypeActionType } from '@neat-js/phenotype'
import * as tf from '@tensorflow/tfjs-node'

import { toActivationFunction } from './toActivationFunction.js'
import type { LayerArgs } from './types/LayerArgs.js'

export class PhenotypeLayer extends tf.layers.Layer {
  readonly phenotype: Phenotype

  constructor(phenotype: Phenotype, args: LayerArgs = {}) {
    args.name = 'PhenotypeLayer'
    super(args)
    this.phenotype = phenotype
  }

  // Forward pass logic
  override call(inputs: tf.Tensor) {
    return tf.tidy(() => {
      const phenotype = this.phenotype
      const batchSize = inputs.shape[0]
      const nodeArray = Array(phenotype.length)
        .fill(null)
        .map(() => tf.zeros([batchSize]))

      // Update the input tensors with the actual inputs
      for (const [i, index] of phenotype.inputs.entries()) {
        const inputValue = inputs.slice([0, i], [batchSize, 1])
        nodeArray[index] = inputValue.reshape([batchSize])
      }

      for (const action of phenotype.actions) {
        let updatedValue: tf.Tensor
        switch (action.type) {
          case PhenotypeActionType.Link: {
            const fromValue = nodeArray[action.from] as tf.Tensor<tf.Rank>
            const toValue = nodeArray[action.to] as tf.Tensor<tf.Rank>
            // Multiply fromValue with scalar, then add to toValue
            updatedValue = toValue.add(
              fromValue.mul(tf.scalar(action.weight, 'float32'))
            )
            nodeArray[action.to] = updatedValue
            break
          }
          case PhenotypeActionType.Activation: {
            const activation = toActivationFunction(action.activation)
            const nodeValue = nodeArray[action.node] as tf.Tensor<tf.Rank>
            // Add bias (broadcasted to [batch_size]), then apply activation function
            updatedValue = activation(
              nodeValue.add(tf.scalar(action.bias, 'float32'))
            )
            nodeArray[action.node] = updatedValue
            break
          }
        }
      }

      // Collect output values
      const outputValues = phenotype.outputs.map(
        (index) => nodeArray[index] as tf.Tensor<tf.Rank>
      )
      return tf.stack(outputValues, 1) // Stack along new axis to keep batch dimension
    })
  }

  // Required: Define the output shape for TensorFlow.js to use.
  override computeOutputShape(
    inputShape: tf.Shape | tf.Shape[]
  ): tf.Shape | tf.Shape[] {
    return [inputShape[0] as number | null, this.phenotype.outputs.length]
  }
}
