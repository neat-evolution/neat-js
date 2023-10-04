import { toLinkKey } from '../link/linkRefToKey.js'
import type { NodeRef } from '../node/NodeRef.js'
import { nodeRefToKey, toNodeKey } from '../node/nodeRefToKey.js'
import { NodeType } from '../node/NodeType.js'

import type { LinkState, NodeState } from './ExtendedState.js'
import { type Innovation, InnovationLog } from './InnovationLog.js'
import type { StateData } from './StateData.js'
import type { StateFactoryOptions } from './StateFactory.js'
import type { StateProvider } from './StateProvider.js'

export class State<
  NS extends NodeState,
  LS extends LinkState,
  S extends State<NS, LS, S>
> implements StateProvider<NS, LS, S>
{
  public readonly innovationLog: InnovationLog
  public readonly nextInnovation: Innovation

  /** only used in DES-HyperNEAT */
  public readonly nodeState: NS

  /** only used in DES-HyperNEAT */
  public readonly linkState: LS

  constructor(
    nodeState: NS,
    linkState: LS,
    stateFactoryOptions?: StateFactoryOptions<NS, LS>
  ) {
    this.innovationLog = new InnovationLog(stateFactoryOptions?.innovationLog)
    this.nextInnovation = {
      nodeNumber: stateFactoryOptions?.nextInnovation.nodeNumber ?? 0,
      innovationNumber:
        stateFactoryOptions?.nextInnovation.innovationNumber ?? 0,
    }
    this.nodeState = nodeState
    this.linkState = linkState
  }

  getSplitInnovation(linkInnovation: number): Innovation {
    if (!this.innovationLog.splitInnovations.has(linkInnovation)) {
      const [from, to] = this.innovationLog.reverseConnectInnovations.get(
        linkInnovation
      ) ?? [null, null]

      if (from === null || to === null) {
        throw new Error('Invalid linkInnovation key.')
      }

      const newNodeKey = toNodeKey(
        NodeType.Hidden,
        this.nextInnovation.nodeNumber
      )

      this.innovationLog.connectInnovations.set(
        toLinkKey(from, newNodeKey),
        this.nextInnovation.innovationNumber
      )

      this.innovationLog.connectInnovations.set(
        toLinkKey(newNodeKey, to),
        this.nextInnovation.innovationNumber + 1
      )

      this.innovationLog.reverseConnectInnovations.set(
        this.nextInnovation.innovationNumber,
        [from, newNodeKey]
      )

      this.innovationLog.reverseConnectInnovations.set(
        this.nextInnovation.innovationNumber + 1,
        [newNodeKey, to]
      )

      this.innovationLog.splitInnovations.set(linkInnovation, {
        ...this.nextInnovation,
      })
      this.innovationLog.hiddenNodeInnovations.set(
        this.nextInnovation.nodeNumber,
        { ...this.nextInnovation }
      )

      this.nextInnovation.nodeNumber += 1
      this.nextInnovation.innovationNumber += 3
    }

    return this.innovationLog.splitInnovations.get(linkInnovation) as Innovation
  }

  getConnectInnovation(from: NodeRef, to: NodeRef): number {
    const fromKey = nodeRefToKey(from)
    const toKey = nodeRefToKey(to)
    const linkKey = toLinkKey(fromKey, toKey)

    if (!this.innovationLog.connectInnovations.has(linkKey)) {
      this.innovationLog.connectInnovations.set(
        linkKey,
        this.nextInnovation.innovationNumber
      )
      this.innovationLog.reverseConnectInnovations.set(
        this.nextInnovation.innovationNumber,
        [fromKey, toKey]
      )
      // Increase global innovation number
      this.nextInnovation.innovationNumber += 1
    }

    return this.innovationLog.connectInnovations.get(linkKey) as number
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
