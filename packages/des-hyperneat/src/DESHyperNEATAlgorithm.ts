import type { Algorithm, NEATConfigOptions } from '@neat-js/core'

import { createConfig } from './createConfig.js'
import { createGenome } from './createGenome.js'
import { createLink } from './createLink.js'
import { createNode } from './createNode.js'
import { createPhenotype } from './createPhenotype.js'
import { createState } from './createState.js'
import type { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import type { DESHyperNEATConfig } from './DESHyperNEATConfig.js'
import type { DESHyperNEATConfigData } from './DESHyperNEATConfigData.js'
import type { DESHyperNEATConfigFactoryOptions } from './DESHyperNEATConfigFactoryOptions.js'
import type { DESHyperNEATGenome } from './DESHyperNEATGenome.js'
import type { DESHyperNEATGenomeData } from './DESHyperNEATGenomeData.js'
import type {
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATNodeData,
  DESHyperNEATLinkData,
} from './DESHyperNEATGenomeFactoryOptions.js'
import {
  defaultDESHyperNEATGenomeOptions,
  type DESHyperNEATGenomeOptions,
} from './DESHyperNEATGenomeOptions.js'
import type { DESHyperNEATLink } from './DESHyperNEATLink.js'
import type { DESHyperNEATLinkFactoryOptions } from './DESHyperNEATLinkFactoryOptions.js'
import type { DESHyperNEATNode } from './DESHyperNEATNode.js'
import type { DESHyperNEATNodeFactoryOptions } from './DESHyperNEATNodeFactoryOptions.js'
import type { DESHyperNEATState } from './DESHyperNEATState.js'
import type { DESHyperNEATStateData } from './DESHyperNEATStateData.js'

export const DESHyperNEATAlgorithm: Algorithm<
  DESHyperNEATConfigFactoryOptions,
  NEATConfigOptions,
  NEATConfigOptions,
  DESHyperNEATConfigData,
  DESHyperNEATConfig,
  CustomStateData,
  CustomStateData,
  CustomState,
  CustomState,
  DESHyperNEATStateData,
  DESHyperNEATState,
  DESHyperNEATNodeData,
  DESHyperNEATLinkData,
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATGenomeOptions,
  DESHyperNEATGenomeData,
  DESHyperNEATNodeFactoryOptions,
  DESHyperNEATNode,
  DESHyperNEATLinkFactoryOptions,
  DESHyperNEATLink,
  DESHyperNEATGenome
> = {
  name: 'DES-HyperNEAT',
  pathname: '@neat-js/des-hyperneat',
  defaultOptions: defaultDESHyperNEATGenomeOptions,
  createConfig,
  createGenome,
  createLink,
  createNode,
  createPhenotype,
  createState,
}
