import type { StateData, StateFactory } from '@neat-evolution/core'

import { NEATState } from './NEATState.js'

export const createState: StateFactory<
  null,
  null,
  null,
  null,
  StateData,
  NEATState
> = () => {
  return new NEATState()
}
