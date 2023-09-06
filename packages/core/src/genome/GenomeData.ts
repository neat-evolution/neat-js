import type { LinkKey } from '../link/linkRefToKey.js'
import type { NodeFactoryOptions } from '../node/NodeFactory.js'
import type { NodeKey } from '../node/nodeRefToKey.js'

import type { Genome } from './Genome.js'
import type { GenomeOptions } from './GenomeOptions.js'

export type GenomeDataNode<
  G extends Genome<any, any, any, any, any, any, any, G>
> = NodeFactoryOptions<G['config']['nodeConfig'], G['state']['nodeState']>

export type GenomeDataLink<
  G extends Genome<any, any, any, any, any, any, any, G>
> = [fromKey: NodeKey, toKey: NodeKey, weight: number, innovation: number]

export type GenomeDataNodeEntry<
  G extends Genome<any, any, any, any, any, any, any, G>
> = [nodeKey: NodeKey, node: GenomeDataNode<G>]

export type GenomeDataLinkEntry<
  G extends Genome<any, any, any, any, any, any, any, G>
> = [linkKey: LinkKey, link: GenomeDataLink<G>]

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
  hiddenNodes: Array<GenomeDataNodeEntry<G>>
  links: Array<GenomeDataLinkEntry<G>>

  /** links are acyclic; skips check for cycles; for performance */
  isSafe: boolean
}
