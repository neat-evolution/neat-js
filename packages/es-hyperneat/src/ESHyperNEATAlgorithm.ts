import type {
  Algorithm,
  ConfigData,
  ConfigFactoryOptions,
  LinkFactoryOptions,
  StateData,
} from '@neat-evolution/core'
import type {
  CPPNGenome,
  CPPNGenomeData,
  CPPNGenomeFactoryOptions,
  CPPNNode,
  CPPNNodeData,
  CPPNNodeFactoryOptions,
} from '@neat-evolution/cppn'
import type {
  NEATConfig,
  NEATLink,
  NEATLinkData,
  NEATState,
} from '@neat-evolution/neat'
import { createConfig, createState } from '@neat-evolution/neat'

import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import {
  defaultESHyperNEATGenomeOptions,
  type ESHyperNEATGenomeOptions,
} from './ESHyperNEATGenomeOptions.js'

export const ESHyperNEATAlgorithm: Algorithm<
  ConfigFactoryOptions,
  null,
  null,
  ConfigData,
  NEATConfig,
  null,
  null,
  null,
  null,
  StateData,
  NEATState,
  CPPNNodeData,
  NEATLinkData,
  CPPNGenomeFactoryOptions,
  ESHyperNEATGenomeOptions,
  CPPNGenomeData<ESHyperNEATGenomeOptions>,
  CPPNNodeFactoryOptions,
  CPPNNode,
  LinkFactoryOptions,
  NEATLink,
  CPPNGenome<ESHyperNEATGenomeOptions>
> = {
  name: 'ES-HyperNEAT',
  pathname: '@neat-evolution/es-hyperneat',
  defaultOptions: defaultESHyperNEATGenomeOptions,
  createConfig,
  createGenome,
  createPhenotype,
  createState,
}
