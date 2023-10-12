import {
  Activation,
  defaultGenomeOptions,
  type GenomeOptions,
  type InitConfig,
} from '@neat-js/core'
import { defaultCPPNGenomeOptions, type CPPNGenomeOptions } from '@neat-js/cppn'

import { type Point } from './Point.js'

export type IOConfig = 'line' | Point[]

export interface HyperNEATGenomeOptions
  extends GenomeOptions,
    CPPNGenomeOptions {
  weightThreshold: number
  hiddenActivation: Activation
  outputActivation: Activation
  initConfig?: InitConfig
  inputConfig: IOConfig
  outputConfig: IOConfig
  hiddenLayerSizes: number[]
  hiddenLayers: Point[][] | null
  /** ES-HyperNEAT */
  resolution: number
}

export const defaultHyperNEATGenomeOptions: HyperNEATGenomeOptions = {
  weightThreshold: 0.1,
  hiddenActivation: Activation.None,
  outputActivation: Activation.Softmax,
  inputConfig: 'line',
  outputConfig: 'line',
  hiddenLayerSizes: [4, 4],
  hiddenLayers: null,
  resolution: 1048576,
  ...defaultGenomeOptions,
  ...defaultCPPNGenomeOptions,
}
