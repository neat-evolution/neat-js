import type {
  Algorithm,
  ConfigData,
  ConfigFactoryOptions,
  LinkFactoryOptions,
  StateData,
} from '@neat-js/core'
import {
  type CPPNNode,
  type CPPNNodeFactoryOptions,
  type CPPNGenome,
  type CPPNGenomeData,
  type CPPNGenomeFactoryOptions,
  type CPPNNodeData,
} from '@neat-js/cppn'
import { createNode } from '@neat-js/cppn'
import type {
  NEATConfig,
  NEATLink,
  NEATLinkData,
  NEATState,
} from '@neat-js/neat'
import { createConfig, createLink, createState } from '@neat-js/neat'

import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import {
  defaultHyperNEATGenomeOptions,
  type HyperNEATGenomeOptions,
} from './HyperNEATGenomeOptions.js'

export const HyperNEATAlgorithm: Algorithm<
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
  HyperNEATGenomeOptions,
  CPPNGenomeData<HyperNEATGenomeOptions>,
  CPPNNodeFactoryOptions,
  CPPNNode,
  LinkFactoryOptions,
  NEATLink,
  CPPNGenome<HyperNEATGenomeOptions>
> = {
  name: 'HyperNEAT',
  pathname: '@neat-js/hyperneat',
  defaultOptions: defaultHyperNEATGenomeOptions,
  createConfig,
  createGenome,
  createLink,
  createNode,
  createPhenotype,
  createState,
}
