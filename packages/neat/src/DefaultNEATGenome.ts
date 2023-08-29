import { NEATGenome } from '@neat-js/core'
import type { NEATConfig, NEATGenomeData } from '@neat-js/core'

import { createGenome } from './createGenome.js'
import { createLink } from './createLink.js'
import { createNode } from './createNode.js'
import { type NEATGenomeOptions } from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'
import type { NEATState } from './NEATState.js'

export interface DefaultNEATGenomeData
  extends NEATGenomeData<NEATNode, NEATLink, NEATGenomeOptions> {}

export class DefaultNEATGenome extends NEATGenome<
  NEATNode,
  NEATLink,
  NEATGenomeOptions
> {
  constructor(
    config: NEATConfig,
    options: NEATGenomeOptions,
    state: NEATState,
    data?: DefaultNEATGenomeData
  ) {
    super(config, options, state, createNode, createLink, createGenome, data)
  }
}
