import type { Activation, GenomeFactoryOptions } from '@neat-js/core'
import type { NEATLinkData } from '@neat-js/neat'

export type CPPNNodeData = [id: number, bias: number, activation: Activation]

export interface CPPNGenomeFactoryOptions
  extends GenomeFactoryOptions<CPPNNodeData, NEATLinkData> {
  outputs: CPPNNodeData[]
}
