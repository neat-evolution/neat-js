import type { Algorithm } from '@neat-js/core'

import { createConfig } from './createConfig.js'
import { createGenome } from './createGenome.js'
import { createLink } from './createLink.js'
import { createNode } from './createNode.js'
import { createPhenotype } from './createPhenotype.js'
import { createState } from './createState.js'
import {
  type DefaultNEATGenome,
  type DefaultNEATGenomeData,
  type DefaultNEATGenomeFactoryOptions,
} from './DefaultNEATGenome.js'
import { fromSharedBuffer } from './fromSharedBuffer.js'
import type { NEATConfig } from './NEATConfig.js'
import {
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
} from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'
import type { NEATState } from './NEATState.js'
import { toSharedBuffer } from './toSharedBuffer.js'

export const NEATAlgorithm: Algorithm<
  NEATNode,
  NEATLink,
  NEATConfig,
  NEATState,
  NEATGenomeOptions,
  DefaultNEATGenomeFactoryOptions,
  DefaultNEATGenomeData,
  DefaultNEATGenome
> = {
  name: 'NEAT',
  pathname: '@neat-js/neat',
  defaultOptions: defaultNEATGenomeOptions,
  createConfig,
  createGenome,
  createLink,
  createNode,
  createPhenotype,
  createState,
  toSharedBuffer,
  fromSharedBuffer,
}
