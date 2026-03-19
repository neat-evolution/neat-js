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
   * When true, backprop can train biases during lifetime learning.
   *
   * @default false
   */
  useBias?: boolean
  mutateHiddenBiasProbability?: number
  mutateHiddenBiasSize?: number
  mutateOutputBiasProbability?: number
  mutateOutputBiasSize?: number
}

export const defaultNEATGenomeOptions: NEATGenomeOptions = {
  ...defaultGenomeOptions,
  hiddenActivation: Activation.Sigmoid,
  outputActivation: Activation.Sigmoid,
  mutateHiddenBiasProbability: 0,
  mutateHiddenBiasSize: 0.03,
  mutateOutputBiasProbability: 0,
  mutateOutputBiasSize: 0.03,
}

export const defaultBackpropNEATGenomeOptions: NEATGenomeOptions = {
  ...defaultNEATGenomeOptions,
  useBias: true,
  mutateHiddenBiasProbability: 0.3,
  mutateOutputBiasProbability: 0.3,
}
