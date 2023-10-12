import type { GenomeFactoryOptions, NodeKey } from '@neat-js/core'

export type NEATHiddenNodeData = number

export type NEATLinkData = [
  from: NodeKey,
  to: NodeKey,
  weight: number,
  innovation: number
]

export type NEATGenomeFactoryOptions = GenomeFactoryOptions<
  NEATHiddenNodeData,
  NEATLinkData
>
