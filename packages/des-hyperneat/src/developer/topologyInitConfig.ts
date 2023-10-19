import { type InitConfig } from '@neat-js/core'

import type { DESHyperNEATGenomeOptions } from '../DESHyperNEATGenomeOptions.js'

import { parseNumSubstrates } from './parseNumSubstrates.js'

export const topologyInitConfig = (
  initConfig: InitConfig,
  options: DESHyperNEATGenomeOptions
): InitConfig => {
  const inputs = parseNumSubstrates(options.inputConfig, initConfig.inputs)
  const outputs = parseNumSubstrates(options.outputConfig, initConfig.outputs)
  return { inputs, outputs }
}
