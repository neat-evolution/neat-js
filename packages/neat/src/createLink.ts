import type { LinkFactory, LinkFactoryOptions } from '@neat-evolution/core'

import type { NEATContext } from './NEATContext.js'
import { NEATLink } from './NEATLink.js'

export const createLink: LinkFactory<NEATContext> = (
  factoryOptions: LinkFactoryOptions
): NEATLink => {
  return new NEATLink(factoryOptions)
}
