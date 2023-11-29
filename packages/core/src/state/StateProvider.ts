import type { NodeKey } from '../node/nodeRefToKey.js'

import type { Innovation, InnovationLog } from './InnovationLog.js'
import type { StateData } from './StateData.js'

export interface State<D> {
  toJSON: () => D
}

export type ExtendedState<D> = State<D> | null

export interface NEATState extends State<StateData> {
  innovationLog: InnovationLog
  nextInnovation: Innovation
  getSplitInnovation: (
    linkInnovation: number
  ) => Innovation | Promise<Innovation>
  getConnectInnovation: (from: NodeKey, to: NodeKey) => number | Promise<number>
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
