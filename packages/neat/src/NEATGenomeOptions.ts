import {
  defaultGenomeOptions,
  type GenomeOptions,
  Activation,
} from '@neat-js/core'

export interface NEATGenomeOptions extends GenomeOptions {
  outputActivation: Activation
}

export const defaultNEATGenomeOptions: NEATGenomeOptions = {
  outputActivation: Activation.Sigmoid,
  ...defaultGenomeOptions,
}
