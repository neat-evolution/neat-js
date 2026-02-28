import type {
  AlgorithmContext,
  ConfigData,
  ConfigFactoryOptions,
  LinkFactoryOptions,
  StateData,
} from '@neat-evolution/core'
import type {
  CPPNGenome,
  CPPNGenomeData,
  CPPNGenomeFactoryOptions,
  CPPNNode,
  CPPNNodeData,
  CPPNNodeFactoryOptions,
} from '@neat-evolution/cppn'
import type {
  NEATConfig,
  NEATLink,
  NEATLinkData,
  NEATState,
} from '@neat-evolution/neat'

import type { ESHyperNEATGenomeOptions } from './ESHyperNEATGenomeOptions.js'

export interface ESHyperNEATContext extends AlgorithmContext {
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
    Options: ESHyperNEATGenomeOptions
    Data: CPPNGenomeData<ESHyperNEATGenomeOptions>
    Type: CPPNGenome<ESHyperNEATGenomeOptions>
  }
}
