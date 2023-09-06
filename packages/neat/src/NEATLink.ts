import { Link } from '@neat-js/core'
import type { NodeRef } from '@neat-js/core'

import { createLink } from './createLink.js'

export class NEATLink extends Link<null, null, NEATLink> {
  constructor(from: NodeRef, to: NodeRef, weight: number, innovation: number) {
    super(from, to, weight, innovation, null, null, createLink)
  }
}
