import type { LinkFactory, LinkFactoryOptions } from '@neat-js/core'

import { NEATLink } from './NEATLink.js'

export const createLink: LinkFactory<
  LinkFactoryOptions,
  null,
  null,
  null,
  NEATLink
> = (factoryOptions: LinkFactoryOptions): NEATLink => {
  return new NEATLink(factoryOptions)
}
