import type { Algorithm } from '@neat-evolution/core'
import {
  createConfig as createNEATConfig,
  createState as createNEATState,
} from '@neat-evolution/neat'

import type { ESHyperNEATContext } from './ESHyperNEATContext.js'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import {
  defaultESHyperNEATGenomeOptions,
} from './ESHyperNEATGenomeOptions.js'

export const ESHyperNEATAlgorithm: Algorithm<ESHyperNEATContext> = {
  name: 'ES-HyperNEAT',
  pathname: '@neat-evolution/es-hyperneat',
  defaultOptions: defaultESHyperNEATGenomeOptions,
  createConfig: (factoryOptions) => createNEATConfig(factoryOptions),
  createGenome,
  createPhenotype,
  createState: () => createNEATState(),
}
