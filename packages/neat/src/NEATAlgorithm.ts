import type { Algorithm } from '@neat-evolution/core'

import { createConfig } from './createConfig.js'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import { createState } from './createState.js'
import type { NEATContext } from './NEATContext.js'
import { defaultNEATGenomeOptions } from './NEATGenomeOptions.js'

export const NEATAlgorithm: Algorithm<NEATContext> = {
  name: 'NEAT',
  pathname: '@neat-evolution/neat',
  defaultOptions: defaultNEATGenomeOptions,
  createConfig,
  createGenome,
  createPhenotype,
  createState,
}
