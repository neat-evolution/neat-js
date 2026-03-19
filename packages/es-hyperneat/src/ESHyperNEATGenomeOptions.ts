import {
  Activation,
  defaultGenomeOptions,
  type GenomeOptions,
  type InitConfig,
  type OutputActivationSpec,
} from '@neat-evolution/core'
import type { CPPNGenomeOptions } from '@neat-evolution/cppn'
import { defaultCPPNGenomeOptions } from '@neat-evolution/cppn'
import type { IOConfig } from '@neat-evolution/hyperneat'

export interface ESHyperNEATGenomeOptions
  extends GenomeOptions,
    CPPNGenomeOptions {
  enableBackprop?: boolean
  initConfig?: InitConfig
  inputConfig: IOConfig
  outputConfig: IOConfig
  varianceThreshold: number
  divisionThreshold: number
  bandThreshold: number
  initialResolution: number
  maxResolution: number
  iterationLevel: number
  resolution: number
  maxDiscoveries: number
  maxOutgoing: number
  hiddenActivation: Activation
  outputActivation: OutputActivationSpec
  maxVariance: boolean
  relativeVariance: boolean
  medianVariance: boolean
  onlyLeafVariance: boolean
  /**
   * Override learning rate for CPPN training during Lamarckian writeback.
   * When set, `chainBackward` uses this as the base rate instead of the
   * substrate learning rate (gradient averaging still applies).
   */
  cppnLearningRate?: number
}

export const defaultESHyperNEATGenomeOptions: ESHyperNEATGenomeOptions = {
  ...defaultGenomeOptions,
  ...defaultCPPNGenomeOptions,
  inputConfig: 'line',
  outputConfig: 'line',
  varianceThreshold: 0.2,
  divisionThreshold: 0.2,
  bandThreshold: 0.3,
  initialResolution: 4,
  maxResolution: 5,
  iterationLevel: 3,
  resolution: 1048576,
  maxDiscoveries: 256,
  maxOutgoing: 32,
  hiddenActivation: Activation.None,
  outputActivation: Activation.Softmax,
  maxVariance: false,
  relativeVariance: false,
  medianVariance: false,
  onlyLeafVariance: true,
}
