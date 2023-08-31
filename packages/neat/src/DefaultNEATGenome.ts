import { NEATGenome } from '@neat-js/core'
import type {
  NEATConfig,
  NEATGenomeData,
  NEATGenomeFactoryOptions,
} from '@neat-js/core'

import { createGenome } from './createGenome.js'
import { createLink } from './createLink.js'
import { createNode } from './createNode.js'
import { type NEATGenomeOptions } from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'
import type { NEATState } from './NEATState.js'

export interface DefaultNEATGenomeData
  extends NEATGenomeData<
    NEATNode,
    NEATLink,
    NEATGenomeOptions,
    NEATGenomeFactoryOptions<NEATNode, NEATLink>
  > {}

export type DefaultNEATGenomeFactoryOptions = NEATGenomeFactoryOptions<
  NEATNode,
  NEATLink
>

export class DefaultNEATGenome extends NEATGenome<
  NEATNode,
  NEATLink,
  NEATGenomeOptions,
  DefaultNEATGenomeFactoryOptions
> {
  constructor(
    config: NEATConfig,
    options: NEATGenomeOptions,
    state: NEATState,
    factoryOptions?: DefaultNEATGenomeFactoryOptions
  ) {
    super(
      config,
      options,
      state,
      createNode,
      createLink,
      createGenome,
      factoryOptions
    )
  }
}
