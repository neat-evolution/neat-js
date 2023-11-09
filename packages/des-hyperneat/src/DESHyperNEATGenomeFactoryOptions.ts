import type { GenomeFactoryOptions, NodeKey } from '@neat-evolution/core'
import type { CPPNGenomeFactoryOptions } from '@neat-evolution/cppn'

export type DESHyperNEATNodeData = [
  id: number,
  cppn: CPPNGenomeFactoryOptions,
  depth: number
]
export type DESHyperNEATLinkData = [
  from: NodeKey,
  to: NodeKey,
  weight: number,
  innovation: number,
  cppn: CPPNGenomeFactoryOptions,
  depth: number
]

export interface DESHyperNEATGenomeFactoryOptions
  extends GenomeFactoryOptions<DESHyperNEATNodeData, DESHyperNEATLinkData> {
  inputs: DESHyperNEATNodeData[]
  outputs: DESHyperNEATNodeData[]
}
