import type { NodeKey } from '../node/nodeRefToKey.js'

export interface LinkRef {
  from: NodeKey
  to: NodeKey
}
