import { Activation } from '@neat-evolution/core'

export type ActivationFunction = (x: number) => number

export function toActivationFunction(
  activation: Activation
): ActivationFunction {
  switch (activation) {
    case Activation.None:
      return (x) => x
    case Activation.Linear:
      return (x) => Math.min(Math.max(x, -1), 1)
    case Activation.Step:
      return (x) => (x > 0 ? 1 : 0)
    case Activation.ReLU:
      return (x) => Math.max(0, x)
    case Activation.Sigmoid:
      return (x) => 1 / (1 + Math.exp(-x))
    case Activation.Tanh:
      return (x) => Math.tanh(x)
    case Activation.Softmax:
      return (x) => Math.exp(x)
    case Activation.Gaussian:
      return (x) => Math.exp(-2.5 * x * x)
    case Activation.OffsetGaussian:
      return (x) => 2 * (Math.expm1(-2.5 * x * x) + 0.5) // 2 * Math.exp(-2.5 * x * x) - 1
    case Activation.Sine:
      return (x) => Math.sin(2 * x)
    case Activation.Cos:
      return (x) => Math.cos(2 * x)
    case Activation.Square:
      return (x) => x * x
    case Activation.Abs:
      return (x) => Math.abs(x)
    case Activation.Exp:
      return (x) => Math.exp(Math.min(x, 1))
    default:
      throw new Error('Unsupported activation function')
  }
}
