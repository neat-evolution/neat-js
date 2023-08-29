import type { NodeRef } from '../node/Node.js'

export type InnovationLinkRef = [from: NodeRef, to: NodeRef]

export interface Innovation {
  nodeNumber: number
  innovationNumber: number
}

export interface InnovationLogData {
  hiddenNodeInnovations: Array<[number, Innovation]>
  splitInnovations: Array<[number, Innovation]>
  connectInnovations: Array<[string, number]>
  reverseConnectInnovations: Array<[number, InnovationLinkRef]>
  hiddenToLink: Array<[string, InnovationLinkRef]>
}

export class InnovationLog {
  hiddenNodeInnovations: Map<number, Innovation>
  splitInnovations: Map<number, Innovation>
  connectInnovations: Map<string, number>
  reverseConnectInnovations: Map<number, InnovationLinkRef>
  hiddenToLink: Map<string, InnovationLinkRef>

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
