import type { LinkState, NodeState } from './ExtendedState.js'
import type { StateData } from './StateData.js'
import type { StateProvider } from './StateProvider.js'

// FIXME: data should be SD not StateData<NS, LS>
export type StateFactory<
  NS extends NodeState,
  LS extends LinkState,
  S extends StateProvider<NS, LS>
> = (data?: StateData<NS, LS>) => S
