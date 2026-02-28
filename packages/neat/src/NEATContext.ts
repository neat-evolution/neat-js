import type {
  AlgorithmContext,
  ConfigData,
  ConfigFactoryOptions,
  LinkFactoryOptions,
  NodeFactoryOptions,
  StateData,
} from '@neat-evolution/core'

import type { NEATConfig } from './NEATConfig.js'
import type { NEATGenome } from './NEATGenome.js'
import type { NEATGenomeData } from './NEATGenomeData.js'
import type {
  NEATGenomeFactoryOptions,
  NEATHiddenNodeData,
  NEATLinkData,
} from './NEATGenomeFactoryOptions.js'
import type { NEATGenomeOptions } from './NEATGenomeOptions.js'
import type { NEATLink } from './NEATLink.js'
import type { NEATNode } from './NEATNode.js'
import type { NEATState } from './NEATState.js'

export interface NEATContext extends AlgorithmContext {
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
    HiddenData: NEATHiddenNodeData
    FactoryOptions: NodeFactoryOptions
    Type: NEATNode
  }
  Link: {
    Data: NEATLinkData
    FactoryOptions: LinkFactoryOptions
    Type: NEATLink
  }
  Genome: {
    FactoryOptions: NEATGenomeFactoryOptions
    Options: NEATGenomeOptions
    Data: NEATGenomeData
    Type: NEATGenome
  }
}
