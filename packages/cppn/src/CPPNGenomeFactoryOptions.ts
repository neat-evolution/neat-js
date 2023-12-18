import type {
  Activation,
  GenomeFactoryOptions,
  NodeId,
} from '@neat-evolution/core'
import type { NEATLinkData } from '@neat-evolution/neat'

export type CPPNNodeData = [id: NodeId, bias: number, activation: Activation]

export interface CPPNGenomeFactoryOptions
  extends GenomeFactoryOptions<CPPNNodeData, NEATLinkData> {
  outputs: CPPNNodeData[]
}
