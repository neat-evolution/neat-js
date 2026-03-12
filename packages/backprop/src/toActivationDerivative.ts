import { Activation } from '@neat-evolution/core'

/**
 * Derivative of an activation function.
 * @param z - Pre-activation value (input to the activation function)
 * @param a - Post-activation value (output of the activation function, a = f(z))
 * @returns The derivative f'(z)
 */
export type ActivationDerivative = (z: number, a: number) => number

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x))

const derivatives: Record<string, ActivationDerivative> = {
  [Activation.None]: () => 1,
  [Activation.Linear]: () => 1,
  [Activation.Step]: () => {
    throw new Error(
      'Step activation is not differentiable and cannot be used with backpropagation'
    )
  },
  [Activation.ReLU]: (z) => (z > 0 ? 1 : 0),
  [Activation.LeakyReLU]: (z) => (z > 0 ? 1 : 0.01),
  [Activation.ELU]: (z) => (z > 0 ? 1 : Math.exp(z)),
  [Activation.Sigmoid]: (_z, a) => a * (1 - a),
  [Activation.Swish]: (z) => {
    const s = sigmoid(z)
    return s * (1 + z * (1 - s))
  },
  [Activation.HardSigmoid]: (z) => {
    if (z < -2.5 || z > 2.5) return 0
    return 0.2
  },
  [Activation.Tanh]: (_z, a) => 1 - a * a,
  [Activation.HardTanh]: (z) => (z < -1 || z > 1 ? 0 : 1),
  [Activation.Softmax]: () => {
    throw new Error(
      'Softmax derivative requires special handling (Jacobian matrix). ' +
        'Use combined softmax + cross-entropy gradient instead.'
    )
  },
  [Activation.Gaussian]: (z) => -5 * z * Math.exp(-2.5 * z * z),
  [Activation.OffsetGaussian]: (z) => -10 * z * Math.exp(-2.5 * z * z),
  [Activation.GELU]: (z) => {
    const k = Math.sqrt(2 / Math.PI)
    const inner = k * (z + 0.044715 * z ** 3)
    const t = Math.tanh(inner)
    const dtdz = (1 - t * t) * k * (1 + 3 * 0.044715 * z * z)
    return 0.5 * (1 + t) + 0.5 * z * dtdz
  },
  [Activation.Sine]: (z) => 2 * Math.cos(2 * z),
  [Activation.Cos]: (z) => -2 * Math.sin(2 * z),
  [Activation.Square]: (z) => 2 * z,
  [Activation.Abs]: () => {
    throw new Error(
      'Abs activation is not differentiable at x=0 and cannot be used with backpropagation'
    )
  },
  [Activation.Softsign]: (z) => {
    const d = Math.abs(z) + 1
    return 1 / (d * d)
  },
  [Activation.Exp]: (z) => Math.exp(z),
  [Activation.ClippedExp]: (z) => (z <= 1 ? Math.exp(z) : 0),
  [Activation.Softplus]: (z) => sigmoid(z),
  [Activation.Mish]: (z) => {
    const sp = Math.log(1 + Math.exp(z))
    const t = Math.tanh(sp)
    const s = sigmoid(z)
    return t + z * (1 - t * t) * s
  },
}

export function toActivationDerivative(
  activation: Activation
): ActivationDerivative {
  const fn = derivatives[activation]
  if (fn === undefined) {
    throw new Error(`Unsupported activation function: ${activation}`)
  }
  return fn
}
