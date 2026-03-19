import type { GenomeOptions, InitConfig } from '@neat-evolution/core'
import { defaultGenomeOptions } from '@neat-evolution/core'
import {
  type CPPNGenomeOptions,
  defaultCPPNGenomeOptions,
} from '@neat-evolution/cppn'
import {
  defaultESHyperNEATGenomeOptions,
  type ESHyperNEATGenomeOptions,
} from '@neat-evolution/es-hyperneat'
import type { Point } from '@neat-evolution/hyperneat'

export type IOConfig = 'line' | 'separate' | Point[][]

export interface DESHyperNEATGenomeOptions
  extends GenomeOptions,
    CPPNGenomeOptions,
    Omit<ESHyperNEATGenomeOptions, 'inputConfig' | 'outputConfig'> {
  singleCPPNState: boolean
  initConfig?: InitConfig
  inputConfig: IOConfig
  outputConfig: IOConfig
  mutateNodeDepthProbability: number
  mutateAllComponents: boolean
  maxInputSubstrateDepth: number
  maxOutputSubstrateDepth: number
  maxHiddenSubstrateDepth: number
  enableIdentityMapping: boolean
  staticSubstrateDepth: number
  /**
   * Whether the substrate phenotype should include biases from the CPPN
   * bias output channel. DES-HyperNEAT defaults to false (matching the
   * original paper). When true, each node CPPN is queried for substrate
   * node biases and the phenotype is marked as bias-trainable for backprop.
   *
   * @default false
   */
  useBias?: boolean
  /**
   * Override learning rate for CPPN training during Lamarckian writeback.
   * When set, `chainBackward` uses this as the base rate instead of the
   * substrate learning rate (gradient averaging still applies).
   */
  cppnLearningRate?: number
}

export const defaultDESHyperNEATGenomeOptions: DESHyperNEATGenomeOptions = {
  ...defaultGenomeOptions,
  ...defaultCPPNGenomeOptions,
  ...defaultESHyperNEATGenomeOptions,
  useBias: false,
  mutateHiddenBiasProbability: 0,
  mutateOutputBiasProbability: 0,
  singleCPPNState: false,
  inputConfig: 'line',
  outputConfig: 'line',
  mutateNodeDepthProbability: 0.1,
  mutateAllComponents: true,
  maxInputSubstrateDepth: 0,
  maxOutputSubstrateDepth: 0,
  maxHiddenSubstrateDepth: 5,
  enableIdentityMapping: true,
  staticSubstrateDepth: -1,
}

export const defaultBackpropDESHyperNEATGenomeOptions: DESHyperNEATGenomeOptions =
  {
    ...defaultDESHyperNEATGenomeOptions,
    useBias: true,
  }
