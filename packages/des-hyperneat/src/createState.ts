import type { StateFactory } from '@neat-evolution/core'

import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import { DESHyperNEATState } from './DESHyperNEATState.js'
import type { DESHyperNEATStateData } from './DESHyperNEATStateData.js'

export const createState: StateFactory<DESHyperNEATContext> = (
  stateFactoryOptions?: DESHyperNEATStateData
) => {
  return new DESHyperNEATState(stateFactoryOptions)
}
