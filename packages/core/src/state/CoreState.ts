import { toLinkKey } from '../link/linkRefToKey.js'
import { toNodeKey, type NodeKey } from '../node/nodeRefToKey.js'
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
> implements NEATState, StateProvider<NSD, LSD, NS, LS, SD>
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

  /**
   * Async during worker reproduction (wrapped in WorkerState)
   * @param {number} linkInnovation the innovation number of the link to split
   * @returns {Innovation | Promise<Innovation>} the innovation for this link
   */
  getSplitInnovation(linkInnovation: number): Innovation | Promise<Innovation> {
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

  /**
   * Async during worker reproduction (wrapped in WorkerState)
   * @param {NodeKey} from source node
   * @param {NodeKey} to target node
   * @returns {number} link innovation number
   */
  getConnectInnovation(from: NodeKey, to: NodeKey): number | Promise<number> {
    const linkKey = toLinkKey(from, to)

    if (!this.innovationLog.connectInnovations.has(linkKey)) {
      this.innovationLog.connectInnovations.set(
        linkKey,
        this.nextInnovation.innovationNumber
      )
      this.innovationLog.reverseConnectInnovations.set(
        this.nextInnovation.innovationNumber,
        [from, to]
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
