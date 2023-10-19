import type { ConfigData, GenomeData, StateData } from '@neat-js/core'

import type {
  NEATGenomeFactoryOptions,
  NEATHiddenNodeData,
  NEATLinkData,
} from './NEATGenomeFactoryOptions.js'
import type { NEATGenomeOptions } from './NEATGenomeOptions.js'

export type NEATGenomeData = GenomeData<
  ConfigData,
  StateData,
  NEATHiddenNodeData,
  NEATLinkData,
  NEATGenomeFactoryOptions,
  NEATGenomeOptions
>
