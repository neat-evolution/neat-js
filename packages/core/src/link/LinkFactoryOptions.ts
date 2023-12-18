import type { NodeKey } from '../node/nodeRefToKey.js'
import type { InnovationKey } from '../state/hashInnovationKey.js'

export interface LinkFactoryOptions {
  from: NodeKey
  to: NodeKey
  weight: number
  innovation: InnovationKey
}
