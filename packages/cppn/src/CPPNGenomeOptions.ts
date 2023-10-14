import { defaultGenomeOptions, type GenomeOptions } from '@neat-js/core'

import {
  type CPPNNodeOptions,
  defaultCPPNNodeOptions,
} from './CPPNNodeOptions.js'

export interface CPPNGenomeOptions extends GenomeOptions, CPPNNodeOptions {
  mutateHiddenBiasProbability: number
  mutateHiddenBiasSize: number
  mutateHiddenActivationProbability: number
  mutateOutputBiasProbability: number
  mutateOutputBiasSize: number
  mutateOutputActivationProbability: number
  padMissingOutputs: boolean
}

export const defaultCPPNGenomeOptions: CPPNGenomeOptions = {
  mutateHiddenBiasProbability: 0.8,
  mutateHiddenBiasSize: 0.03,
  mutateHiddenActivationProbability: 0.1,
  mutateOutputBiasProbability: 0.8,
  mutateOutputBiasSize: 0.03,
  mutateOutputActivationProbability: 0.1,
  padMissingOutputs: false,
  ...defaultGenomeOptions,
  ...defaultCPPNNodeOptions,
}
