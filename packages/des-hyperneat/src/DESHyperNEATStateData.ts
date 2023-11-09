import type { StateData } from '@neat-evolution/core'

import type { CustomStateData } from './CustomStateData.js'

export interface DESHyperNEATStateData extends StateData {
  custom: CustomStateData
}
