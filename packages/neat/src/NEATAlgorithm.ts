import type {
  Algorithm,
  ConfigData,
  ConfigFactoryOptions,
  LinkFactoryOptions,
  NodeFactoryOptions,
  StateData,
} from '@neat-evolution/core'

import { createConfig } from './createConfig.js'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import { createState } from './createState.js'
import type { NEATConfig } from './NEATConfig.js'
import type { NEATGenome } from './NEATGenome.js'
import type { NEATGenomeData } from './NEATGenomeData.js'
import type {
  NEATGenomeFactoryOptions,
  NEATHiddenNodeData,
  NEATLinkData,
} from './NEATGenomeFactoryOptions.js'
import {
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
} from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'
import type { NEATState } from './NEATState.js'

export const NEATAlgorithm: Algorithm<
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
  NEATHiddenNodeData,
  NEATLinkData,
  NEATGenomeFactoryOptions,
  NEATGenomeOptions,
  NEATGenomeData,
  NodeFactoryOptions,
  NEATNode,
  LinkFactoryOptions,
  NEATLink,
  NEATGenome
> = {
  name: 'NEAT',
  pathname: '@neat-evolution/neat',
  defaultOptions: defaultNEATGenomeOptions,
  createConfig,
  createGenome,
  createPhenotype,
  createState,
}
