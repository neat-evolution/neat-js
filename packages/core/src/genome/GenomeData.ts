import type { NodeKey } from '../node/nodeRefToKey.js'

import type { Genome } from './Genome.js'
import type { GenomeOptions } from './GenomeOptions.js'

/** Node.id; implied to be NodeType.Hidden */
export type GenomeDataNode = number

export type GenomeDataLink = [
  fromKey: NodeKey,
  toKey: NodeKey,
  weight: number,
  innovation: number
]

// FIXME: Do we need to add NLCS here?
export interface GenomeData<
  GO extends GenomeOptions,
  G extends Genome<any, any, any, any, GO, any, any, G>
> {
  // shared state
  config: ReturnType<G['config']['toJSON']>
  state: ReturnType<G['state']['toJSON']>
  genomeOptions: GO

  // factory options
  hiddenNodes: GenomeDataNode[]
  links: GenomeDataLink[]

  /** links are acyclic; skips check for cycles; for performance */
  isSafe: boolean
}
