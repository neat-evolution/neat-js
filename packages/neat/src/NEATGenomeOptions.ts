import {
  Activation,
  defaultGenomeOptions,
  type GenomeOptions,
  type OutputActivationSpec,
} from '@neat-evolution/core'

export interface NEATGenomeOptions extends GenomeOptions {
  hiddenActivation: Activation
  outputActivation: OutputActivationSpec
  /**
   * Whether the phenotype should include trainable biases.
   * NEAT genomes do not store per-node biases, so this defaults to false.
   * When true, backprop can train biases during lifetime learning.
   *
   * @default false
   */
  useBias?: boolean
}

export const defaultNEATGenomeOptions: NEATGenomeOptions = {
  ...defaultGenomeOptions,
  hiddenActivation: Activation.Sigmoid,
  outputActivation: Activation.Sigmoid,
}
