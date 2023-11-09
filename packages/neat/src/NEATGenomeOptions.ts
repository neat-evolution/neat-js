import {
  defaultGenomeOptions,
  type GenomeOptions,
  Activation,
} from '@neat-evolution/core'

export interface NEATGenomeOptions extends GenomeOptions {
  outputActivation: Activation
}

export const defaultNEATGenomeOptions: NEATGenomeOptions = {
  ...defaultGenomeOptions,
  outputActivation: Activation.Sigmoid,
}
