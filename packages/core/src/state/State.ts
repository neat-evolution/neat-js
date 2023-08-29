import { nodeRefsToLinkKey } from '../link/Link.js'
import { NodeType, type NodeRef, nodeRefToKey } from '../node/Node.js'

import type { LinkState, NodeState } from './ExtendedState.js'
import {
  type Innovation,
  InnovationLog,
  type InnovationLinkRef,
} from './InnovationLog.js'
import type { StateData } from './StateData.js'
import type { StateProvider } from './StateProvider.js'

export class State<NS extends NodeState, LS extends LinkState>
  implements StateProvider<NS, LS>
{
  public readonly innovationLog: InnovationLog
  public readonly nextInnovation: Innovation

  /** only used in DES-HyperNEAT */
  public readonly nodeState: NS

  /** only used in DES-HyperNEAT */
  public readonly linkState: LS

  // FIXME: an options interface that accepted only data would be more flexible.
  constructor(nodeState: NS, linkState: LS, data?: StateData<NS, LS>) {
    this.innovationLog = new InnovationLog(data?.neat.innovationLog)
    this.nextInnovation = {
      nodeNumber: data?.neat.nextInnovation.nodeNumber ?? 0,
      innovationNumber: data?.neat.nextInnovation.innovationNumber ?? 0,
    }
    this.nodeState = nodeState
    this.linkState = linkState
  }

  getLinkSplitByHidden(hiddenNode: NodeRef): InnovationLinkRef | null {
    const result = this.innovationLog.hiddenToLink.get(nodeRefToKey(hiddenNode))
    return result ?? null
  }

  getSplitInnovation(linkInnovation: number): Innovation {
    if (!this.innovationLog.splitInnovations.has(linkInnovation)) {
      const [from, to] = this.innovationLog.reverseConnectInnovations.get(
        linkInnovation
      ) ?? [null, null]

      if (from === null || to === null) {
        throw new Error('Invalid linkInnovation key.')
      }

      const newNode = {
        type: NodeType.Hidden,
        id: this.nextInnovation.nodeNumber,
      }

      this.innovationLog.hiddenToLink.set(nodeRefToKey(newNode), [from, to])

      this.innovationLog.connectInnovations.set(
        nodeRefsToLinkKey(from, newNode),
        this.nextInnovation.innovationNumber
      )

      this.innovationLog.connectInnovations.set(
        nodeRefsToLinkKey(newNode, to),
        this.nextInnovation.innovationNumber + 1
      )

      this.innovationLog.reverseConnectInnovations.set(
        this.nextInnovation.innovationNumber,
        [from, newNode]
      )

      this.innovationLog.reverseConnectInnovations.set(
        this.nextInnovation.innovationNumber + 1,
        [newNode, to]
      )

      const newInnovation: Innovation = {
        nodeNumber: this.nextInnovation.nodeNumber,
        innovationNumber: this.nextInnovation.innovationNumber,
      }

      this.innovationLog.splitInnovations.set(linkInnovation, newInnovation)
      this.innovationLog.hiddenNodeInnovations.set(
        this.nextInnovation.nodeNumber,
        newInnovation
      )

      this.nextInnovation.nodeNumber += 1
      this.nextInnovation.innovationNumber += 3
    }

    return this.innovationLog.splitInnovations.get(linkInnovation) as Innovation
  }

  getConnectInnovation(from: NodeRef, to: NodeRef): number {
    const key = nodeRefsToLinkKey(from, to)

    if (!this.innovationLog.connectInnovations.has(key)) {
      this.innovationLog.connectInnovations.set(
        key,
        this.nextInnovation.innovationNumber
      )
      this.innovationLog.reverseConnectInnovations.set(
        this.nextInnovation.innovationNumber,
        [from, to]
      )

      this.nextInnovation.innovationNumber += 1
    }

    return this.innovationLog.connectInnovations.get(key) as number
  }

  neat(): this {
    return this
  }

  node(): NS {
    return this.nodeState
  }

  link(): LS {
    return this.linkState
  }

  toJSON(): StateData<NS, LS> {
    return {
      neat: {
        innovationLog: this.innovationLog.toJSON(),
        nextInnovation: this.nextInnovation,
      },
      node: this.nodeState,
      link: this.linkState,
    }
  }
}
