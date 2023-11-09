import type {
  Algorithm,
  ConfigData,
  ConfigFactoryOptions,
  LinkFactoryOptions,
  StateData,
} from '@neat-evolution/core'
import {
  type CPPNNode,
  type CPPNNodeFactoryOptions,
  type CPPNGenome,
  type CPPNGenomeData,
  type CPPNGenomeFactoryOptions,
  type CPPNNodeData,
} from '@neat-evolution/cppn'
import { createNode } from '@neat-evolution/cppn'
import type {
  NEATConfig,
  NEATLink,
  NEATLinkData,
  NEATState,
} from '@neat-evolution/neat'
import { createConfig, createLink, createState } from '@neat-evolution/neat'

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
  createLink,
  createNode,
  createPhenotype,
  createState,
}
