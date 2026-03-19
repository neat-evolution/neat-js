import { Activation } from '@neat-evolution/core'

/**
 * Differentiable activations safe for CPPN hidden nodes in all modes.
 * Step and Abs are excluded (throw during backpropagation).
 * Softmax is excluded from hidden activations because it requires
 * multi-output Jacobian handling that only applies to output groups.
 */
const defaultHiddenActivations: Activation[] = [
  Activation.None,
  Activation.Linear,
  Activation.ReLU,
  Activation.LeakyReLU,
  Activation.ELU,
  Activation.Sigmoid,
  Activation.Swish,
  Activation.HardSigmoid,
  Activation.Tanh,
  Activation.HardTanh,
  Activation.Gaussian,
  Activation.OffsetGaussian,
  Activation.GELU,
  Activation.Sine,
  Activation.Cos,
  Activation.Square,
  Activation.Softsign,
  Activation.Exp,
  Activation.ClippedExp,
  Activation.Softplus,
  Activation.Mish,
]

export interface CPPNNodeOptions {
  hiddenActivations: Activation[]
  outputActivations: Activation[]
}

/** Output activations include Softmax (proper Jacobian support in backward). */
const defaultOutputActivations: Activation[] = [
  ...defaultHiddenActivations,
  Activation.Softmax,
]

export const defaultCPPNNodeOptions: CPPNNodeOptions = {
  hiddenActivations: [...defaultHiddenActivations],
  outputActivations: [...defaultOutputActivations],
}
