import { NodeType } from '../index.js'
import { toNodeKey, type NodeKey } from '../node/nodeRefToKey.js'

import { hashInnovationKey, type InnovationKey } from './hashInnovationKey.js'
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
  /**
   * Async during worker reproduction (wrapped in WorkerState)
   * @param {InnovationKey} innovationKey the innovation key of the link to split
   * @returns {NodeKey | Promise<NodeKey>} the node key to insert
   */
  getSplitInnovation(innovationKey: InnovationKey): NodeKey | Promise<NodeKey> {
    const nodeId = hashInnovationKey(innovationKey)
    const nodeKey = toNodeKey(NodeType.Hidden, nodeId)
    return nodeKey
  }

  /**
   * Async during worker reproduction (wrapped in WorkerState)
   * @param {NodeKey} from source node
   * @param {NodeKey} to target node
   * @returns {number} link innovation number
   */
  getConnectInnovation(
    from: NodeKey,
    to: NodeKey
  ): InnovationKey | Promise<InnovationKey> {
    return from + ':' + to
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
      neat: null,
    } as unknown as SD
  }
}
