import {
  Activation,
  defaultGenomeOptions,
  type GenomeOptions,
  type OutputActivationSpec,
} from '@neat-evolution/core'

export interface NEATGenomeOptions extends GenomeOptions {
  hiddenActivation: Activation
  outputActivation: OutputActivationSpec
}

export const defaultNEATGenomeOptions: NEATGenomeOptions = {
  ...defaultGenomeOptions,
  hiddenActivation: Activation.Sigmoid,
  outputActivation: Activation.Sigmoid,
}
