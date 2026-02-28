import type { LinkFactory, NEATConfigOptions } from '@neat-evolution/core'

import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import {
  type DESHyperNEATGenomeOptions,
  defaultDESHyperNEATGenomeOptions,
} from './DESHyperNEATGenomeOptions.js'
import { DESHyperNEATLink } from './DESHyperNEATLink.js'
import type { DESHyperNEATLinkFactoryOptions } from './DESHyperNEATLinkFactoryOptions.js'

export type DESHyperNEATLinkFactory = LinkFactory<DESHyperNEATContext>

export const createLinkFactory =
  (options: DESHyperNEATGenomeOptions): DESHyperNEATLinkFactory =>
  (
    factoryOptions: DESHyperNEATLinkFactoryOptions,
    config: NEATConfigOptions,
    state: DESHyperNEATContext['State']['Link']
  ) => {
    return new DESHyperNEATLink(
      options,
      factoryOptions,
      config,
      state,
      createLinkFactory(options)
    )
  }

/**
 * @deprecated Use `createLinkFactory` instead.
 */
export const createLink = createLinkFactory(defaultDESHyperNEATGenomeOptions)
