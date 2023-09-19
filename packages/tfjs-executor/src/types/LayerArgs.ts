import type * as tf from '@tensorflow/tfjs-node'

// @see @tensorflow/tfjs-layers/dist/engine/topology.d.ts
export interface LayerArgs {
  /**
   * If defined, will be used to create an input layer to insert before this
   * layer. If both `inputShape` and `batchInputShape` are defined,
   * `batchInputShape` will be used. This argument is only applicable to input
   * layers (the first layer of a model).
   */
  inputShape?: tf.Shape
  /**
   * If defined, will be used to create an input layer to insert before this
   * layer. If both `inputShape` and `batchInputShape` are defined,
   * `batchInputShape` will be used. This argument is only applicable to input
   * layers (the first layer of a model).
   */
  batchInputShape?: tf.Shape
  /**
   * If `inputShape` is specified and `batchInputShape` is *not* specified,
   * `batchSize` is used to construct the `batchInputShape`: `[batchSize,
   * ...inputShape]`
   */
  batchSize?: number
  /**
   * The data-type for this layer. Defaults to 'float32'.
   * This argument is only applicable to input layers (the first layer of a
   * model).
   */
  dtype?: tf.DataType
  /** Name for this layer. */
  name?: string
  /**
   * Whether the weights of this layer are updatable by `fit`.
   * Defaults to true.
   */
  trainable?: boolean
  /**
   * Initial weight values of the layer.
   */
  weights?: tf.Tensor[]
  /** Legacy support. Do not use for new code. */
  inputDType?: tf.DataType
}
