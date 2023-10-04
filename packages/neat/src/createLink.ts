import type { LinkFactory, NodeKey } from '@neat-js/core'

import { NEATLink } from './NEATLink.js'

export const createLink: LinkFactory<null, null, NEATLink> = (
  from: NodeKey,
  to: NodeKey,
  weight: number,
  innovation: number
): NEATLink => {
  return new NEATLink(from, to, weight, innovation)
}
