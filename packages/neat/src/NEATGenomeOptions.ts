import {
  defaultGenomeOptions,
  type GenomeOptions,
  Activation,
} from '@neat-evolution/core'

export interface NEATGenomeOptions extends GenomeOptions {
  hiddenActivation: Activation
  outputActivation: Activation
}

export const defaultNEATGenomeOptions: NEATGenomeOptions = {
  ...defaultGenomeOptions,
  hiddenActivation: Activation.Sigmoid,
  outputActivation: Activation.Sigmoid,
}
