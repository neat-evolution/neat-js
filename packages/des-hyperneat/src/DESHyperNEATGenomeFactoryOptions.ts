import type {
  GenomeFactoryOptions,
  InnovationKey,
  NodeId,
  NodeKey,
} from '@neat-evolution/core'
import type { CPPNGenomeFactoryOptions } from '@neat-evolution/cppn'

export type DESHyperNEATNodeData = [
  id: NodeId,
  cppn: CPPNGenomeFactoryOptions,
  depth: number,
]
export type DESHyperNEATLinkData = [
  from: NodeKey,
  to: NodeKey,
  weight: number,
  innovation: InnovationKey,
  cppn: CPPNGenomeFactoryOptions,
  depth: number,
]

export interface DESHyperNEATGenomeFactoryOptions extends GenomeFactoryOptions<
  DESHyperNEATNodeData,
  DESHyperNEATLinkData
> {
  inputs: DESHyperNEATNodeData[]
  outputs: DESHyperNEATNodeData[]
}
