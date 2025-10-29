import { Activation } from '@neat-evolution/core'

const allActivations: Activation[] = [
  Activation.None,
  Activation.Linear,
  Activation.Step,
  Activation.ReLU,
  Activation.LeakyReLU,
  Activation.ELU,
  Activation.Sigmoid,
  Activation.Swish,
  Activation.HardSigmoid,
  Activation.Tanh,
  Activation.HardTanh,
  Activation.Softmax,
  Activation.Gaussian,
  Activation.OffsetGaussian,
  Activation.GELU,
  Activation.Sine,
  Activation.Cos,
  Activation.Square,
  Activation.Abs,
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

export const defaultCPPNNodeOptions: CPPNNodeOptions = {
  hiddenActivations: [...allActivations],
  outputActivations: [...allActivations],
}
