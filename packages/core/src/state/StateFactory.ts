import type { StateData } from './StateData.js'
import type { ExtendedState, StateProvider } from './StateProvider.js'

export type StateFactory<
  NSD,
  LSD,
  NS extends ExtendedState<NSD>,
  LS extends ExtendedState<LSD>,
  SD extends StateData,
  S extends StateProvider<NSD, LSD, NS, LS, SD>,
> = (factoryOptions?: SD) => S
