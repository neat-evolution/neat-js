import { Activation } from '@neat-evolution/core'

export type ActivationFunction = (x: number) => number

export function toActivationFunction(
  activation: Activation
): ActivationFunction {
  switch (activation) {
    case Activation.None:
    case Activation.Linear:
      return (x) => x
    case Activation.Step:
      return (x) => (x > 0 ? 1 : 0)
    case Activation.ReLU:
      return (x) => Math.max(0, x)
    case Activation.LeakyReLU:
      return (x) => (x > 0 ? x : 0.01 * x)
    case Activation.ELU:
      return (x) => (x > 0 ? x : Math.expm1(x))
    case Activation.Sigmoid:
      return (x) => 1 / (1 + Math.exp(-x))
    case Activation.Swish:
      return (x) => x / (1 + Math.exp(-x)) // Or x * sigmoid(x)
    case Activation.HardSigmoid:
      return (x) => {
        if (x < -2.5) return 0
        if (x > 2.5) return 1
        return 0.2 * x + 0.5
      }
    case Activation.Tanh:
      return (x) => Math.tanh(x)
    case Activation.HardTanh:
      return (x) => Math.min(Math.max(x, -1), 1)
    case Activation.Softmax:
      return (x) => Math.exp(x)
    case Activation.Gaussian:
      return (x) => Math.exp(-2.5 * x * x)
    case Activation.OffsetGaussian:
      return (x) => 2 * (Math.expm1(-2.5 * x * x) + 0.5)
    case Activation.GELU:
      // Gaussian Error Linear Unit (GELU) - Approximation
      return (x) =>
        0.5 *
        x *
        (1 +
          Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3))))
    case Activation.Sine:
      return (x) => Math.sin(2 * x)
    case Activation.Cos:
      return (x) => Math.cos(2 * x)
    case Activation.Square:
      return (x) => x * x
    case Activation.Abs:
      return (x) => Math.abs(x)
    case Activation.Softsign:
      return (x) => x / (Math.abs(x) + 1)
    case Activation.ClippedExp:
      return (x) => Math.exp(Math.min(x, 1))
    case Activation.Exp:
      return (x) => Math.exp(x)
    case Activation.Softplus:
      return (x) => Math.log(1 + Math.exp(x))
    case Activation.Mish:
      return (x) => {
        const softplusX = Math.log(1 + Math.exp(x))
        return x * Math.tanh(softplusX)
      }
    default:
      throw new Error('Unsupported activation function')
  }
}
