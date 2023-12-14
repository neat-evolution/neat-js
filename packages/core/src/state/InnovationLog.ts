import type { LinkKey } from '../link/linkRefToKey.js'
import type { NodeKey } from '../node/nodeRefToKey.js'

export type InnovationLinkRef = [from: NodeKey, to: NodeKey]

export type Innovation = [nodeNumber: number, innovationNumber: number]

export interface InnovationLogData {
  splitInnovations: Array<[number, Innovation]>
  connectInnovations: Array<[LinkKey, number]>
  reverseConnectInnovations: Array<[number, InnovationLinkRef]>
}

export interface InnovationLogOptions {
  maxHiddenNodeInnovationsSize?: number
  maxSplitInnovationsSize?: number
  maxConnectInnovationsSize?: number
  maxReverseConnectInnovationsSize?: number
  maxHiddenToLinkSize?: number
}

export class InnovationLog {
  public readonly splitInnovations: Map<number, Innovation>
  public readonly connectInnovations: Map<LinkKey, number>
  public readonly reverseConnectInnovations: Map<number, InnovationLinkRef>

  constructor(data?: InnovationLogData) {
    this.splitInnovations = new Map(data?.splitInnovations)
    this.connectInnovations = new Map(data?.connectInnovations)
    this.reverseConnectInnovations = new Map(data?.reverseConnectInnovations)
  }

  toJSON(): InnovationLogData {
    return {
      splitInnovations: [...this.splitInnovations.entries()],
      connectInnovations: [...this.connectInnovations.entries()],
      reverseConnectInnovations: [...this.reverseConnectInnovations.entries()],
    }
  }
}
