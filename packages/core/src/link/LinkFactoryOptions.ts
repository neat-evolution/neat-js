import type { NodeKey } from '../node/nodeRefToKey.js'

export interface LinkFactoryOptions {
  from: NodeKey
  to: NodeKey
  weight: number
  innovation: number
}
