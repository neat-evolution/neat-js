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
    SD extends StateData,
  >
  implements NEATState, StateProvider<NSD, LSD, NS, LS, SD>
{
  public readonly innovationLog: InnovationLog
  public readonly nextInnovation: Innovation

  constructor(factoryOptions?: SD) {
    this.innovationLog = new InnovationLog(factoryOptions?.neat.innovationLog)
    this.nextInnovation = [
      factoryOptions?.neat.nextInnovation[0] ?? 0,
      factoryOptions?.neat.nextInnovation[1] ?? 0,
    ]
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

      const newNodeKey = toNodeKey(NodeType.Hidden, this.nextInnovation[0])

      this.innovationLog.connectInnovations.set(
        toLinkKey(from, newNodeKey),
        this.nextInnovation[1]
      )

      this.innovationLog.connectInnovations.set(
        toLinkKey(newNodeKey, to),
        this.nextInnovation[1] + 1
      )

      this.innovationLog.reverseConnectInnovations.set(this.nextInnovation[1], [
        from,
        newNodeKey,
      ])

      this.innovationLog.reverseConnectInnovations.set(
        this.nextInnovation[1] + 1,
        [newNodeKey, to]
      )

      this.innovationLog.splitInnovations.set(linkInnovation, [
        ...this.nextInnovation,
      ])

      this.nextInnovation[0] += 1
      this.nextInnovation[1] += 3
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
      this.innovationLog.connectInnovations.set(linkKey, this.nextInnovation[1])
      this.innovationLog.reverseConnectInnovations.set(this.nextInnovation[1], [
        from,
        to,
      ])
      // Increase global innovation number
      this.nextInnovation[1] += 1
    }

    return this.innovationLog.connectInnovations.get(linkKey) as number
  }

  neat(): NEATState {
    return this
  }

  node(): NS {
    throw new Error('Not implemented')
  }

  link(): LS {
    throw new Error('Not implemented')
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
