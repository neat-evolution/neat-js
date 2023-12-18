import type {
  GenomeFactoryOptions,
  InnovationKey,
  NodeId,
  NodeKey,
} from '@neat-evolution/core'

export type NEATHiddenNodeData = NodeId

export type NEATLinkData = [
  from: NodeKey,
  to: NodeKey,
  weight: number,
  innovation: InnovationKey,
]

export type NEATGenomeFactoryOptions = GenomeFactoryOptions<
  NEATHiddenNodeData,
  NEATLinkData
>
