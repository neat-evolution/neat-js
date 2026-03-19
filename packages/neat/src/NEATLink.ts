import type { LinkFactoryOptions } from '@neat-evolution/core'
import { CoreLink } from '@neat-evolution/core'
import { createLink } from './createLink.js'
import type { NEATContext } from './NEATContext.js'

export class NEATLink extends CoreLink<NEATContext> {
  constructor(factoryOptions: LinkFactoryOptions) {
    super(factoryOptions, null, null, createLink)
  }

  /**
   * Decorate a LinkFactoryOptions object as a NEATLink by setting its
   * prototype. The factoryOptions already has { from, to, weight, innovation };
   * config/state/createLink come from the prototype. Zero allocation —
   * the factory options object IS the link.
   */
  static from(factoryOptions: LinkFactoryOptions): NEATLink {
    const link = factoryOptions as unknown as NEATLink
    Object.setPrototypeOf(link, NEATLink.prototype)
    // Set constant fields as own properties. Can't use prototype assignment
    // due to circular import (createLink imports NEATLink and vice versa).
    const init = link as unknown as {
      config: null
      state: null
      createLink: typeof createLink
    }
    init.config = null
    init.state = null
    init.createLink = createLink
    return link
  }
}
