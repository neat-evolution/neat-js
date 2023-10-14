import { type NEATConfigOptions, type InitConfig } from '@neat-js/core'
import {
  CPPNAlgorithm,
  type CPPNGenome,
  type CPPNGenomeOptions,
} from '@neat-js/cppn'
import { type NEATState } from '@neat-js/neat'

import { insertIdentity } from './insertIdentity.js'

export const identityGenome = (
  configOptions: NEATConfigOptions,
  genomeOptions: CPPNGenomeOptions
): [genome: CPPNGenome<CPPNGenomeOptions>, state: NEATState] => {
  const config = CPPNAlgorithm.createConfig(configOptions, null, null)
  const initConfig: InitConfig = { inputs: 4, outputs: 2 }
  const state = CPPNAlgorithm.createState()
  const genome = CPPNAlgorithm.createGenome(
    config,
    state,
    genomeOptions,
    initConfig
  )

  insertIdentity(genome, 0)

  return [genome, state]
}
