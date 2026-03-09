import type { LinkFactoryOptions } from '@neat-evolution/core'
import { CoreLink } from '@neat-evolution/core'
import { createLink } from './createLink.js'
import type { NEATContext } from './NEATContext.js'

export class NEATLink extends CoreLink<NEATContext> {
  constructor(factoryOptions: LinkFactoryOptions) {
    super(factoryOptions, null, null, createLink)
  }
}
