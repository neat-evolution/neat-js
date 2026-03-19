import {
  Activation,
  defaultGenomeOptions,
  type GenomeOptions,
  type InitConfig,
  type OutputActivationSpec,
} from '@neat-evolution/core'
import {
  type CPPNGenomeOptions,
  defaultCPPNGenomeOptions,
} from '@neat-evolution/cppn'

import type { Point } from './Point.js'

export type IOConfig = 'line' | Point[]

export interface HyperNEATGenomeOptions
  extends GenomeOptions,
    CPPNGenomeOptions {
  weightThreshold: number
  hiddenActivation: Activation
  outputActivation: OutputActivationSpec
  initConfig?: InitConfig
  inputConfig: IOConfig
  outputConfig: IOConfig
  hiddenLayerSizes: number[]
  hiddenLayers: Point[][] | null
  /** ES-HyperNEAT */
  resolution: number
  /**
   * Override learning rate for CPPN training during Lamarckian writeback.
   * When set, `chainBackward` uses this as the base rate instead of the
   * substrate learning rate (gradient averaging still applies).
   */
  cppnLearningRate?: number
}

export const defaultHyperNEATGenomeOptions: HyperNEATGenomeOptions = {
  ...defaultGenomeOptions,
  ...defaultCPPNGenomeOptions,
  weightThreshold: 0.1,
  hiddenActivation: Activation.None,
  outputActivation: Activation.Softmax,
  inputConfig: 'line',
  outputConfig: 'line',
  hiddenLayerSizes: [4, 4],
  hiddenLayers: null,
  resolution: 1048576,
}
