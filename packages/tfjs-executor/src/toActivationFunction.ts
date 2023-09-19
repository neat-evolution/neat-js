import { Activation } from '@neat-js/core'
import * as tf from '@tensorflow/tfjs-node'

export type ActivationFunction = (x: tf.Tensor) => tf.Tensor

export function toActivationFunction(
  activation: Activation
): ActivationFunction {
  switch (activation) {
    case Activation.None:
      return (x) => x

    case Activation.Linear:
      return (x) => tf.clipByValue(x, -1, 1)

    case Activation.Step:
      return (x) => tf.step(x)

    case Activation.ReLU:
      return (x) => tf.relu(x)

    case Activation.Sigmoid:
      return (x) => tf.sigmoid(x)

    case Activation.Tanh:
      return (x) => tf.tanh(x)

    case Activation.Softmax:
      return (x) => tf.exp(x) // Note: Softmax is usually applied across a dimension, not element-wise.

    case Activation.Gaussian:
      return (x) => tf.exp(tf.mul(tf.scalar(-2.5), tf.square(x)))

    case Activation.OffsetGaussian:
      return (x) =>
        tf.sub(
          tf.mul(tf.scalar(2), tf.exp(tf.mul(tf.scalar(-2.5), tf.square(x)))),
          tf.scalar(1)
        )

    case Activation.Sine:
      return (x) => tf.sin(tf.mul(tf.scalar(2), x))

    case Activation.Cos:
      return (x) => tf.cos(tf.mul(tf.scalar(2), x))

    case Activation.Square:
      return (x) => tf.square(x)

    case Activation.Abs:
      return (x) => tf.abs(x)

    case Activation.Exp:
      return (x) => tf.exp(tf.minimum(x, tf.scalar(1)))

    default:
      throw new Error('Unsupported activation function')
  }
}
