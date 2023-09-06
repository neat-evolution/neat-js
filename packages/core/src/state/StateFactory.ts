import type { LinkState, NodeState } from './ExtendedState.js'
import type { StateData } from './StateData.js'
import type { StateProvider } from './StateProvider.js'

export type StateFactoryOptions<
  NS extends NodeState,
  LS extends LinkState
> = StateData<NS, LS>['neat']

export type StateFactory<
  NS extends NodeState,
  LS extends LinkState,
  S extends StateProvider<NS, LS, S>
> = (stateFactoryOptions?: StateFactoryOptions<NS, LS>) => S
