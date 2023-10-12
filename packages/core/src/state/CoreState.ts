import { toLinkKey } from '../link/linkRefToKey.js'
import type { NodeRef } from '../node/NodeRef.js'
import { nodeRefToKey, toNodeKey } from '../node/nodeRefToKey.js'
import { NodeType } from '../node/NodeType.js'

import { type Innovation, InnovationLog } from './InnovationLog.js'
import type { StateData } from './StateData.js'
import type {
  ExtendedState,
  NEATState,
  StateProvider,
} from './StateProvider.js'

export class CoreState<
  NSD,
  LSD,
  NS extends ExtendedState<NSD>,
  LS extends ExtendedState<LSD>,
  SD extends StateData
> implements StateProvider<NSD, LSD, NS, LS, SD>
{
  public readonly innovationLog: InnovationLog
  public readonly nextInnovation: Innovation

  // public readonly nodeState: NS
  // public readonly linkState: LS

  constructor(factoryOptions?: SD) {
    this.innovationLog = new InnovationLog(factoryOptions?.neat.innovationLog)
    this.nextInnovation = {
      nodeNumber: factoryOptions?.neat.nextInnovation.nodeNumber ?? 0,
      innovationNumber:
        factoryOptions?.neat.nextInnovation.innovationNumber ?? 0,
    }
    // this.nodeState = factoryOptions?.node ?? null
    // this.linkState = factoryOptions?.link ?? null
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

  neat(): NEATState {
    return this
  }

  node(): NS {
    throw new Error('Not implemented')
    // return this.nodeState
  }

  link(): LS {
    throw new Error('Not implemented')
    // return this.linkState
  }

  toJSON(): SD {
    return {
      neat: {
        innovationLog: this.innovationLog.toJSON(),
        nextInnovation: this.nextInnovation,
      },
    } as unknown as SD
  }
}
