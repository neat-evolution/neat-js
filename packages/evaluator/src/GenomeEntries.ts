import type { Genome } from '@neat-js/core'

export type GenomeEntry<
  G extends Genome<any, any, any, any, any, any, any, G>
> = [speciesIndex: number, organismIndex: number, genome: G]

export type GenomeEntries<
  G extends Genome<any, any, any, any, any, any, any, G>
> = Iterable<GenomeEntry<G>>
