import { Activation } from '@neat-js/core'

const allActivations: Activation[] = [
  Activation.None,
  Activation.Linear,
  Activation.Step,
  Activation.ReLU,
  Activation.Sigmoid,
  Activation.Tanh,
  Activation.Gaussian,
  Activation.OffsetGaussian,
  Activation.Sine,
]

export interface CPPNNodeOptions {
  hiddenActivations: Activation[]
  outputActivations: Activation[]
}

export const defaultCPPNNodeOptions: CPPNNodeOptions = {
  hiddenActivations: [...allActivations],
  outputActivations: [...allActivations],
}
