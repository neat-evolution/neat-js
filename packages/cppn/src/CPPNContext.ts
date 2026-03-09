import type {
  AlgorithmContext,
  ConfigData,
  ConfigFactoryOptions,
  LinkFactoryOptions,
  StateData,
} from '@neat-evolution/core'
import type {
  NEATConfig,
  NEATLink,
  NEATLinkData,
  NEATState,
} from '@neat-evolution/neat'

import type { CPPNGenome } from './CPPNGenome.js'
import type { CPPNGenomeData } from './CPPNGenomeData.js'
import type {
  CPPNGenomeFactoryOptions,
  CPPNNodeData,
} from './CPPNGenomeFactoryOptions.js'
import type { CPPNGenomeOptions } from './CPPNGenomeOptions.js'
import type { CPPNNode } from './CPPNNode.js'
import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'

export interface CPPNContext<GO extends CPPNGenomeOptions = CPPNGenomeOptions>
  extends AlgorithmContext {
  Config: {
    FactoryOptions: ConfigFactoryOptions
    NodeOptions: null
    LinkOptions: null
    Data: ConfigData
    Type: NEATConfig
  }
  State: {
    Data: StateData
    NodeData: null
    LinkData: null
    Node: null
    Link: null
    Type: NEATState
  }
  Node: {
    HiddenData: CPPNNodeData
    FactoryOptions: CPPNNodeFactoryOptions
    Type: CPPNNode
  }
  Link: {
    Data: NEATLinkData
    FactoryOptions: LinkFactoryOptions
    Type: NEATLink
  }
  Genome: {
    FactoryOptions: CPPNGenomeFactoryOptions
    Options: GO
    Data: CPPNGenomeData<GO>
    Type: CPPNGenome<GO>
  }
}
