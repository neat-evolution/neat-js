import type { StateFactory, StateData } from '@neat-js/core'

import { NEATState } from './NEATState.js'

export const createState: StateFactory<
  null,
  null,
  null,
  null,
  StateData,
  NEATState
> = (stateFactoryOptions?: StateData) => {
  return new NEATState(stateFactoryOptions)
}
