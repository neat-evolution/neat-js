import type { GenomeOptions, InitConfig } from '@neat-js/core'
import { defaultGenomeOptions } from '@neat-js/core'
import { type CPPNGenomeOptions, defaultCPPNGenomeOptions } from '@neat-js/cppn'
import {
  type ESHyperNEATGenomeOptions,
  defaultESHyperNEATGenomeOptions,
} from '@neat-js/es-hyperneat'
import type { Point } from '@neat-js/hyperneat'

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
}

export const defaultDESHyperNEATGenomeOptions: DESHyperNEATGenomeOptions = {
  ...defaultGenomeOptions,
  ...defaultCPPNGenomeOptions,
  ...defaultESHyperNEATGenomeOptions,
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
