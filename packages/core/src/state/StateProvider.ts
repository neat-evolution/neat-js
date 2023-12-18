import type { NodeKey } from '../node/nodeRefToKey.js'

import type { InnovationKey } from './hashInnovationKey.js'
import type { StateData } from './StateData.js'

export interface State<D> {
  toJSON: () => D
}

export type ExtendedState<D> = State<D> | null

export interface NEATState extends State<StateData> {
  getSplitInnovation: (
    innovationKey: InnovationKey
  ) => NodeKey | Promise<NodeKey>
  getConnectInnovation: (
    from: NodeKey,
    to: NodeKey
  ) => InnovationKey | Promise<InnovationKey>
}

export interface StateProvider<
  NSD,
  LSD,
  NS extends ExtendedState<NSD>,
  LS extends ExtendedState<LSD>,
  SD extends StateData,
> {
  neat: () => NEATState
  node: () => NS
  link: () => LS
  toJSON: () => SD
}
