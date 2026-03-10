import { NodeType } from '../index.js'
import { toLinkKey } from '../link/linkRefToKey.js'
import { type NodeKey, toNodeKey } from '../node/nodeRefToKey.js'
import {
  splitInnovationNodeId,
  type InnovationKey,
} from './hashInnovationKey.js'
import type { StateData } from './StateData.js'
import type {
  ExtendedState,
  NEATState,
  StateProvider,
} from './StateProvider.js'

export class CoreState<
  NSD = unknown,
  LSD = unknown,
  NS extends ExtendedState<NSD> = ExtendedState<NSD>,
  LS extends ExtendedState<LSD> = ExtendedState<LSD>,
  SD extends StateData = StateData,
> implements NEATState, StateProvider<NSD, LSD, NS, LS, SD>
{
  getSplitInnovation(from: NodeKey, to: NodeKey): NodeKey | Promise<NodeKey> {
    const nodeId = splitInnovationNodeId(from, to)
    const nodeKey = toNodeKey(NodeType.Hidden, nodeId)
    return nodeKey
  }

  getConnectInnovation(
    from: NodeKey,
    to: NodeKey
  ): InnovationKey | Promise<InnovationKey> {
    return toLinkKey(from, to)
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
