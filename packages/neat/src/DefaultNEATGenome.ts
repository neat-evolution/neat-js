import { NEATGenome } from '@neat-js/core'
import type { NEATGenomeData, NEATGenomeFactoryOptions } from '@neat-js/core'

import { createGenome } from './createGenome.js'
import { createLink } from './createLink.js'
import { createNode } from './createNode.js'
import type { NEATConfig } from './NEATConfig.js'
import { type NEATGenomeOptions } from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'
import type { NEATState } from './NEATState.js'

export interface DefaultNEATGenomeData
  extends NEATGenomeData<
    NEATNode,
    NEATLink,
    NEATConfig,
    NEATState,
    NEATGenomeOptions,
    // FIXME: stops a circular reference
    any, // DefaultNEATGenomeFactoryOptions
    DefaultNEATGenomeData,
    DefaultNEATGenome
  > {}

export type DefaultNEATGenomeFactoryOptions = NEATGenomeFactoryOptions<
  NEATNode,
  NEATLink,
  NEATConfig,
  NEATState,
  NEATGenomeOptions,
  // FIXME: stops a circular reference
  any, // DefaultNEATGenomeFactoryOptions
  DefaultNEATGenomeData,
  DefaultNEATGenome
>

export class DefaultNEATGenome extends NEATGenome<
  NEATNode,
  NEATLink,
  NEATConfig,
  NEATState,
  NEATGenomeOptions,
  DefaultNEATGenomeFactoryOptions,
  DefaultNEATGenomeData,
  DefaultNEATGenome
> {
  constructor(
    config: NEATConfig,
    state: NEATState,
    options: NEATGenomeOptions,
    factoryOptions?: DefaultNEATGenomeFactoryOptions
  ) {
    super(
      config,
      state,
      options,
      createNode,
      createLink,
      createGenome,
      factoryOptions
    )
  }
}
