import { Activation } from '@neat-evolution/core'

export type ActivationFunction = (x: number) => number

const functions: Record<string, ActivationFunction> = {
  [Activation.None]: (x) => x,
  [Activation.Linear]: (x) => x,
  [Activation.Step]: (x) => (x > 0 ? 1 : 0),
  [Activation.ReLU]: (x) => Math.max(0, x),
  [Activation.LeakyReLU]: (x) => (x > 0 ? x : 0.01 * x),
  [Activation.ELU]: (x) => (x > 0 ? x : Math.expm1(x)),
  [Activation.Sigmoid]: (x) => 1 / (1 + Math.exp(-x)),
  [Activation.Swish]: (x) => x / (1 + Math.exp(-x)),
  [Activation.HardSigmoid]: (x) => {
    if (x < -2.5) return 0
    if (x > 2.5) return 1
    return 0.2 * x + 0.5
  },
  [Activation.Tanh]: (x) => Math.tanh(x),
  [Activation.HardTanh]: (x) => Math.min(Math.max(x, -1), 1),
  [Activation.Softmax]: (x) => Math.exp(x),
  [Activation.Gaussian]: (x) => Math.exp(-2.5 * x * x),
  [Activation.OffsetGaussian]: (x) => 2 * (Math.expm1(-2.5 * x * x) + 0.5),
  [Activation.GELU]: (x) =>
    0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3))),
  [Activation.Sine]: (x) => Math.sin(2 * x),
  [Activation.Cos]: (x) => Math.cos(2 * x),
  [Activation.Square]: (x) => x * x,
  [Activation.Abs]: (x) => Math.abs(x),
  [Activation.Softsign]: (x) => x / (Math.abs(x) + 1),
  [Activation.ClippedExp]: (x) => Math.exp(Math.min(x, 1)),
  [Activation.Exp]: (x) => Math.exp(x),
  [Activation.Softplus]: (x) => Math.log(1 + Math.exp(x)),
  [Activation.Mish]: (x) => {
    const softplusX = Math.log(1 + Math.exp(x))
    return x * Math.tanh(softplusX)
  },
}

export function toActivationFunction(
  activation: Activation
): ActivationFunction {
  const fn = functions[activation]
  if (fn === undefined) {
    throw new Error(`Unsupported activation function: ${activation}`)
  }
  return fn
}
