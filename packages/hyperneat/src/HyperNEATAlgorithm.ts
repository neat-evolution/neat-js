import type { Algorithm } from '@neat-evolution/core'
import {
  createConfig as createNEATConfig,
  createState as createNEATState,
} from '@neat-evolution/neat'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import type { HyperNEATContext } from './HyperNEATContext.js'
import { defaultHyperNEATGenomeOptions } from './HyperNEATGenomeOptions.js'

export const HyperNEATAlgorithm: Algorithm<HyperNEATContext> = {
  name: 'HyperNEAT',
  pathname: '@neat-evolution/hyperneat',
  defaultOptions: defaultHyperNEATGenomeOptions,
  createConfig: (factoryOptions) => createNEATConfig(factoryOptions),
  createGenome,
  createPhenotype,
  createState: () => createNEATState(),

  writeBackWeights(): void {
    throw new Error(
      'writeBackWeights is not yet implemented for HyperNEAT. ' +
        'Lamarckian writeback requires CPPN distillation for both ' +
        'substrate weights and biases.'
    )
  },
}
