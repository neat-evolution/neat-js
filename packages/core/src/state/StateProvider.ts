import type { LinkState, NodeState } from './ExtendedState.js'
import type { State } from './State.js'
import type { StateData } from './StateData.js'

export interface StateProvider<NS extends NodeState, LS extends LinkState> {
  // FIXME: this should return S instead of State<NS, LS>
  neat: () => State<NS, LS>
  node: () => NS
  link: () => LS
  // FIXME: this should return SD instead of StateData<NS, LS>
  toJSON: () => StateData<NS, LS>
}
