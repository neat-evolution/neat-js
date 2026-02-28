import type { Algorithm } from '@neat-evolution/core'
import {
  createConfig as createNEATConfig,
  createState as createNEATState,
} from '@neat-evolution/neat'

import type { HyperNEATContext } from './HyperNEATContext.js'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import {
  defaultHyperNEATGenomeOptions,
} from './HyperNEATGenomeOptions.js'

export const HyperNEATAlgorithm: Algorithm<HyperNEATContext> = {
  name: 'HyperNEAT',
  pathname: '@neat-evolution/hyperneat',
  defaultOptions: defaultHyperNEATGenomeOptions,
  createConfig: (factoryOptions) => createNEATConfig(factoryOptions),
  createGenome,
  createPhenotype,
  createState: () => createNEATState(),
}
