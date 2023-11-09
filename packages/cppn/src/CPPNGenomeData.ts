import type { ConfigData, GenomeData, StateData } from '@neat-evolution/core'
import type { NEATLinkData } from '@neat-evolution/neat'

import type {
  CPPNGenomeFactoryOptions,
  CPPNNodeData,
} from './CPPNGenomeFactoryOptions.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'

export type CPPNGenomeData<GO extends CPPNGenomeOptions> = GenomeData<
  ConfigData,
  StateData,
  CPPNNodeData,
  NEATLinkData,
  CPPNGenomeFactoryOptions,
  GO
>
