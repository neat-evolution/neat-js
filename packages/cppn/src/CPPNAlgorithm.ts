import type {
  Algorithm,
  ConfigData,
  ConfigFactoryOptions,
  LinkFactoryOptions,
  StateData,
} from '@neat-evolution/core'
import { createConfig, createLink, createState } from '@neat-evolution/neat'
import type {
  NEATConfig,
  NEATLink,
  NEATLinkData,
  NEATState,
} from '@neat-evolution/neat'

import { type CPPNGenome } from './CPPNGenome.js'
import type { CPPNGenomeData } from './CPPNGenomeData.js'
import type {
  CPPNGenomeFactoryOptions,
  CPPNNodeData,
} from './CPPNGenomeFactoryOptions.js'
import {
  defaultCPPNGenomeOptions,
  type CPPNGenomeOptions,
} from './CPPNGenomeOptions.js'
import type { CPPNNode } from './CPPNNode.js'
import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'
import { createGenome } from './createGenome.js'
import { createNode } from './createNode.js'
import { createPhenotype } from './createPhenotype.js'

export const CPPNAlgorithm: Algorithm<
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
  CPPNGenomeOptions,
  CPPNGenomeData<CPPNGenomeOptions>,
  CPPNNodeFactoryOptions,
  CPPNNode,
  LinkFactoryOptions,
  NEATLink,
  CPPNGenome<CPPNGenomeOptions>
> = {
  name: 'CPPN',
  pathname: '@neat-evolution/cppn',
  defaultOptions: defaultCPPNGenomeOptions,
  createConfig,
  createGenome,
  createLink,
  createNode,
  createPhenotype,
  createState,
}
