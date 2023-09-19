import { Activation } from '@neat-js/core'
import { type Texture, type GPU } from 'gpu.js'

export type ActivationKernel = (
  values: Texture | Float32Array,
  bias: number
) => Texture

export const toActivationKernel = (
  gpu: GPU,
  activation: Activation,
  batchSize: number
): ActivationKernel => {
  switch (activation) {
    case Activation.None:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return x + bias
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Linear:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return Math.min(Math.max(x + bias, -1), 1)
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Step:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return x + bias > 0 ? 1 : 0
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.ReLU:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return Math.max(0, x + bias)
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Sigmoid:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return 1 / (1 + Math.exp(-(x + bias)))
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Tanh:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return Math.tanh(x + bias)
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Softmax:
      // Note: Implementing softmax in a single kernel might be non-trivial due to the normalization step
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return Math.exp(x + bias)
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Gaussian:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return Math.exp(-2.5 * (x + bias) ** 2)
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.OffsetGaussian:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return 2 * Math.exp(-2.5 * (x + bias) ** 2) - 1
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Sine:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return Math.sin(2 * (x + bias))
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Cos:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return Math.cos(2 * (x + bias))
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Square:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return (x + bias) ** 2
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Abs:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return Math.abs(x + bias)
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    case Activation.Exp:
      return gpu
        .createKernel(function (values: number[], bias: number) {
          const x = values[this.thread.x] as number
          return Math.exp(Math.min(x + bias, 1))
        })
        .setOutput([batchSize])
        .setImmutable(true)
        .setPipeline(true) as unknown as ActivationKernel

    default:
      throw new Error('Unsupported activation function')
  }
}
