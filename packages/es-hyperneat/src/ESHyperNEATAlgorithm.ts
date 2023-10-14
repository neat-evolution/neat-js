import type { Algorithm, LinkFactoryOptions, StateData } from '@neat-js/core'
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
  defaultESHyperNEATGenomeOptions,
  type ESHyperNEATGenomeOptions,
} from './ESHyperNEATGenomeOptions.js'

export const ESHyperNEATAlgorithm: Algorithm<
  null,
  null,
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
  name: 'ESHyperNEAT',
  pathname: '@neat-js/es-hyperneat',
  defaultOptions: defaultESHyperNEATGenomeOptions,
  createConfig,
  createGenome,
  createLink,
  createNode,
  createPhenotype,
  createState,
}
