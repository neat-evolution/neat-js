import type { LinkFactory, NEATConfigOptions } from '@neat-evolution/core'

import type { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import {
  type DESHyperNEATGenomeOptions,
  defaultDESHyperNEATGenomeOptions,
} from './DESHyperNEATGenomeOptions.js'
import { DESHyperNEATLink } from './DESHyperNEATLink.js'
import type { DESHyperNEATLinkFactoryOptions } from './DESHyperNEATLinkFactoryOptions.js'

export type DESHyperNEATLinkFactory = LinkFactory<
  DESHyperNEATLinkFactoryOptions,
  NEATConfigOptions,
  CustomStateData,
  CustomState,
  DESHyperNEATLink
>

export const createLinkFactory =
  (options: DESHyperNEATGenomeOptions): DESHyperNEATLinkFactory =>
  (
    factoryOptions: DESHyperNEATLinkFactoryOptions,
    config: NEATConfigOptions,
    state: CustomState
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
