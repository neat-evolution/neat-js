import type { NodeRef } from '../node/NodeData.js'
import { toNodeKey } from '../node/nodeRefToKey.js'

import type { LinkRef } from './LinkData.js'

/** `${toNodeKey(fromType, fromId)} -> ${toNodeKey(toType, toId)}` */
export type LinkKey = string

export const linkRefToKey = (linkRef: LinkRef): string => {
  return toLinkKey(
    linkRef.from.type,
    linkRef.from.id,
    linkRef.to.type,
    linkRef.to.id
  )
}

export const nodeRefsToLinkKey = (from: NodeRef, to: NodeRef): string => {
  return toLinkKey(from.type, from.id, to.type, to.id)
}

export const toLinkKey = (
  fromType: NodeRef['type'],
  fromId: NodeRef['id'],
  toType: NodeRef['type'],
  toId: NodeRef['id']
): string => {
  return `${toNodeKey(fromType, fromId)} -> ${toNodeKey(toType, toId)}`
}
