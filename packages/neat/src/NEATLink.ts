import { CoreLink } from '@neat-js/core'
import type { LinkFactoryOptions } from '@neat-js/core'

import { createLink } from './createLink.js'

export class NEATLink extends CoreLink<
  LinkFactoryOptions,
  null,
  null,
  null,
  NEATLink
> {
  constructor(factoryOptions: LinkFactoryOptions) {
    super(factoryOptions, null, null, createLink)
  }
}
