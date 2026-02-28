import type { StateFactory } from '@neat-evolution/core'

import type { NEATContext } from './NEATContext.js'
import { NEATState } from './NEATState.js'

export const createState: StateFactory<NEATContext> = () => {
  return new NEATState()
}
