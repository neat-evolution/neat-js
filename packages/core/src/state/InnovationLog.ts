import type { LinkKey } from '../link/linkRefToKey.js'
import type { NodeRef } from '../node/NodeData.js'
import type { NodeKey } from '../node/nodeRefToKey.js'

export type InnovationLinkRef = [from: NodeRef, to: NodeRef]

export interface Innovation {
  nodeNumber: number
  innovationNumber: number
}

export interface InnovationLogData {
  hiddenNodeInnovations: Array<[number, Innovation]>
  splitInnovations: Array<[number, Innovation]>
  connectInnovations: Array<[LinkKey, number]>
  reverseConnectInnovations: Array<[number, InnovationLinkRef]>
  hiddenToLink: Array<[NodeKey, InnovationLinkRef]>
}

export interface InnovationLogOptions {
  maxHiddenNodeInnovationsSize?: number
  maxSplitInnovationsSize?: number
  maxConnectInnovationsSize?: number
  maxReverseConnectInnovationsSize?: number
  maxHiddenToLinkSize?: number
}

export class InnovationLog {
  public readonly hiddenNodeInnovations: Map<number, Innovation>
  public readonly splitInnovations: Map<number, Innovation>
  public readonly connectInnovations: Map<LinkKey, number>
  public readonly reverseConnectInnovations: Map<number, InnovationLinkRef>
  public readonly hiddenToLink: Map<NodeKey, InnovationLinkRef>

  constructor(data?: InnovationLogData) {
    this.hiddenNodeInnovations = new Map(data?.hiddenNodeInnovations)
    this.splitInnovations = new Map(data?.splitInnovations)
    this.connectInnovations = new Map(data?.connectInnovations)
    this.reverseConnectInnovations = new Map(data?.reverseConnectInnovations)
    this.hiddenToLink = new Map(data?.hiddenToLink)
  }

  toJSON(): InnovationLogData {
    return {
      hiddenNodeInnovations: [...this.hiddenNodeInnovations.entries()],
      splitInnovations: [...this.splitInnovations.entries()],
      connectInnovations: [...this.connectInnovations.entries()],
      reverseConnectInnovations: [...this.reverseConnectInnovations.entries()],
      hiddenToLink: [...this.hiddenToLink.entries()],
    }
  }
}
