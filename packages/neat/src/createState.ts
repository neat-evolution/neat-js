import type { StateData, StateFactory } from '@neat-js/core'

import { NEATState } from './NEATState.js'

export const createState: StateFactory<null, null, NEATState> = (
  data?: StateData<null, null>
) => {
  return new NEATState(data)
}
