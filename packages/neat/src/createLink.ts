import type { LinkFactory } from '@neat-js/core'
import type { NodeRef } from '@neat-js/core'

import { NEATLink } from './NEATLink.js'

export const createLink: LinkFactory<null, null, NEATLink> = (
  from: NodeRef,
  to: NodeRef,
  weight: number,
  innovation: number
): NEATLink => {
  return new NEATLink(from, to, weight, innovation)
}
