import type { GenomeOptions, InitConfig } from '@neat-evolution/core'
import { defaultGenomeOptions } from '@neat-evolution/core'
import {
  type CPPNGenomeOptions,
  defaultCPPNGenomeOptions,
} from '@neat-evolution/cppn'
import {
  type ESHyperNEATGenomeOptions,
  defaultESHyperNEATGenomeOptions,
} from '@neat-evolution/es-hyperneat'
import type { Point } from '@neat-evolution/hyperneat'

export type IOConfig = 'line' | 'separate' | Point[][]

export interface DESHyperNEATGenomeOptions
  extends
    GenomeOptions,
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
