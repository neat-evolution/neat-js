import { type NEATGenomeStats } from '@neat-js/core'
import type { Algorithm } from '@neat-js/evolution'

import { createConfig } from './createConfig.js'
import { createGenome } from './createGenome.js'
import { createLink } from './createLink.js'
import { createNode } from './createNode.js'
import { createPhenotype } from './createPhenotype.js'
import { createState } from './createState.js'
import {
  type DefaultNEATGenome,
  type DefaultNEATGenomeFactoryOptions,
} from './DefaultNEATGenome.js'
import {
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
} from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'

export const NEATAlgorithm: Algorithm<
  NEATNode,
  NEATLink,
  NEATGenomeStats,
  NEATGenomeOptions,
  DefaultNEATGenomeFactoryOptions,
  DefaultNEATGenome
> = {
  defaultOptions: defaultNEATGenomeOptions,
  createConfig,
  createGenome,
  createLink,
  createNode,
  createPhenotype,
  createState,
}
