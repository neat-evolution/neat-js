import type { NodeRef } from '../node/NodeRef.js'
import { nodeRefToKey, type NodeKey } from '../node/nodeRefToKey.js'

import type { LinkRef } from './LinkRef.js'

/** `${from}${to}` */
export type LinkKey = string

export const linkRefToKey = (linkRef: LinkRef): string => {
  return toLinkKey(linkRef.from, linkRef.to)
}

export const nodeRefsToLinkKey = (from: NodeRef, to: NodeRef): string => {
  return toLinkKey(nodeRefToKey(from), nodeRefToKey(to))
}

export const toLinkKey = (from: NodeKey, to: NodeKey): string => {
  return `${from}${to}`
}
