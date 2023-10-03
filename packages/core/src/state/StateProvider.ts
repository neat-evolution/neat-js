import type { NodeRef } from '../index.js'

import type { LinkState, NodeState } from './ExtendedState.js'
import type { Innovation } from './InnovationLog.js'
import type { StateData } from './StateData.js'

export interface StateProvider<
  NS extends NodeState,
  LS extends LinkState,
  S extends StateProvider<NS, LS, S>
> {
  readonly nodeState: NS
  readonly linkState: LS

  getSplitInnovation: (
    linkInnovation: number
  ) => Innovation | Promise<Innovation>
  getConnectInnovation: (from: NodeRef, to: NodeRef) => number | Promise<number>

  neat: () => this

  /** only useful in des-hyperneat */
  node: () => NS

  /** only useful in des-hyperneat */
  link: () => LS

  toJSON: () => StateData<NS, LS>
}
