import type { StateFactory } from '@neat-js/core'

import type { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import { DESHyperNEATState } from './DESHyperNEATState.js'
import type { DESHyperNEATStateData } from './DESHyperNEATStateData.js'

export const createState: StateFactory<
  CustomStateData,
  CustomStateData,
  CustomState,
  CustomState,
  DESHyperNEATStateData,
  DESHyperNEATState
> = (stateFactoryOptions?: DESHyperNEATStateData) => {
  return new DESHyperNEATState(stateFactoryOptions)
}
