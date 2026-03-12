import type { Algorithm } from '@neat-evolution/core'
import { createConfig } from './createConfig.js'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import { createState } from './createState.js'
import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import { defaultDESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'

export const DESHyperNEATAlgorithm: Algorithm<DESHyperNEATContext> = {
  name: 'DES-HyperNEAT',
  pathname: '@neat-evolution/des-hyperneat',
  defaultOptions: defaultDESHyperNEATGenomeOptions,
  createConfig,
  createGenome,
  createPhenotype,
  createState,

  writeBackWeights(): void {
    throw new Error(
      'writeBackWeights is not yet implemented for DES-HyperNEAT. ' +
        'Lamarckian writeback requires CPPN distillation for both ' +
        'substrate weights and biases.'
    )
  },
}
