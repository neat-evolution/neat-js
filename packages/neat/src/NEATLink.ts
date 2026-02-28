import type { LinkFactoryOptions } from '@neat-evolution/core'
import { CoreLink } from '@neat-evolution/core'

import type { NEATContext } from './NEATContext.js'
import { createLink } from './createLink.js'

export class NEATLink extends CoreLink<NEATContext> {
  constructor(factoryOptions: LinkFactoryOptions) {
    super(factoryOptions, null, null, createLink)
  }
}
