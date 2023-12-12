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
  pathname: '@neat-evolution/hyperneat',
  defaultOptions: defaultHyperNEATGenomeOptions,
  createConfig,
  createGenome,
  createPhenotype,
  createState,
}
