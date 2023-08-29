import type { GenomeFactory } from '@neat-js/core'
import type { NEATConfig } from '@neat-js/core'

import {
  DefaultNEATGenome,
  type DefaultNEATGenomeData,
} from './DefaultNEATGenome.js'
import { type NEATGenomeOptions } from './NEATGenomeOptions.js'
import type { NEATState } from './NEATState.js'

export const createGenome: GenomeFactory<
  NEATGenomeOptions,
  DefaultNEATGenome,
  DefaultNEATGenomeData
> = (
  config: NEATConfig,
  options: NEATGenomeOptions,
  state: NEATState,
  data?: DefaultNEATGenomeData
) => {
  return new DefaultNEATGenome(config, options, state, data)
}
