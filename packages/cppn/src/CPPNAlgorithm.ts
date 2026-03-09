import type { Algorithm } from '@neat-evolution/core'
import {
  createConfig as createNEATConfig,
  createState as createNEATState,
} from '@neat-evolution/neat'

import type { CPPNContext } from './CPPNContext.js'
import { defaultCPPNGenomeOptions } from './CPPNGenomeOptions.js'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'

export const CPPNAlgorithm: Algorithm<CPPNContext> = {
  name: 'CPPN',
  pathname: '@neat-evolution/cppn',
  defaultOptions: defaultCPPNGenomeOptions,
  createConfig: (factoryOptions) => createNEATConfig(factoryOptions),
  createGenome,
  createPhenotype,
  createState: () => createNEATState(),
}
