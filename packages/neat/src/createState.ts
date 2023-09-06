import type { StateFactory, StateFactoryOptions } from '@neat-js/core'

import { NEATState } from './NEATState.js'

export const createState: StateFactory<null, null, NEATState> = (
  stateFactoryOptions?: StateFactoryOptions<null, null>
) => {
  return new NEATState(stateFactoryOptions)
}
