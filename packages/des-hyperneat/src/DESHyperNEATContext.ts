import type { AlgorithmContext, NEATConfigOptions } from '@neat-evolution/core'

import type { CustomState } from './CustomState.js'
import type { CustomStateData } from './CustomStateData.js'
import type { DESHyperNEATConfig } from './DESHyperNEATConfig.js'
import type { DESHyperNEATConfigData } from './DESHyperNEATConfigData.js'
import type { DESHyperNEATConfigFactoryOptions } from './DESHyperNEATConfigFactoryOptions.js'
import type { DESHyperNEATGenome } from './DESHyperNEATGenome.js'
import type { DESHyperNEATGenomeData } from './DESHyperNEATGenomeData.js'
import type {
  DESHyperNEATGenomeFactoryOptions,
  DESHyperNEATLinkData,
  DESHyperNEATNodeData,
} from './DESHyperNEATGenomeFactoryOptions.js'
import type { DESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import type { DESHyperNEATLink } from './DESHyperNEATLink.js'
import type { DESHyperNEATLinkFactoryOptions } from './DESHyperNEATLinkFactoryOptions.js'
import type { DESHyperNEATNode } from './DESHyperNEATNode.js'
import type { DESHyperNEATNodeFactoryOptions } from './DESHyperNEATNodeFactoryOptions.js'
import type { DESHyperNEATState } from './DESHyperNEATState.js'
import type { DESHyperNEATStateData } from './DESHyperNEATStateData.js'

export interface DESHyperNEATContext extends AlgorithmContext {
  Config: {
    FactoryOptions: DESHyperNEATConfigFactoryOptions
    NodeOptions: NEATConfigOptions
    LinkOptions: NEATConfigOptions
    Data: DESHyperNEATConfigData
    Type: DESHyperNEATConfig
  }
  State: {
    Data: DESHyperNEATStateData
    NodeData: CustomStateData
    LinkData: CustomStateData
    Node: CustomState
    Link: CustomState
    Type: DESHyperNEATState
  }
  Node: {
    HiddenData: DESHyperNEATNodeData
    FactoryOptions: DESHyperNEATNodeFactoryOptions
    Type: DESHyperNEATNode
  }
  Link: {
    Data: DESHyperNEATLinkData
    FactoryOptions: DESHyperNEATLinkFactoryOptions
    Type: DESHyperNEATLink
  }
  Genome: {
    FactoryOptions: DESHyperNEATGenomeFactoryOptions
    Options: DESHyperNEATGenomeOptions
    Data: DESHyperNEATGenomeData
    Type: DESHyperNEATGenome
  }
}
