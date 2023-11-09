import {
  Activation,
  defaultGenomeOptions,
  type GenomeOptions,
  type InitConfig,
} from '@neat-evolution/core'
import { defaultCPPNGenomeOptions } from '@neat-evolution/cppn'
import type { CPPNGenomeOptions } from '@neat-evolution/cppn'
import type { IOConfig } from '@neat-evolution/hyperneat'

export interface ESHyperNEATGenomeOptions
  extends GenomeOptions,
    CPPNGenomeOptions {
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
  outputActivation: Activation
  maxVariance: boolean
  relativeVariance: boolean
  medianVariance: boolean
  onlyLeafVariance: boolean
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
