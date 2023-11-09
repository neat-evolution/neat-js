import type { GenomeData } from '@neat-evolution/core'

import type { DESHyperNEATConfigData } from './DESHyperNEATConfigData.js'
import type {
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATLinkData,
  DESHyperNEATNodeData,
} from './DESHyperNEATGenomeFactoryOptions.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import type { DESHyperNEATStateData } from './DESHyperNEATStateData.js'

export type DESHyperNEATGenomeData = GenomeData<
  DESHyperNEATConfigData,
  DESHyperNEATStateData,
  DESHyperNEATNodeData,
  DESHyperNEATLinkData,
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATGenomeOptions
>
