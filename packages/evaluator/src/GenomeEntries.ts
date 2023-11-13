import type { AnyGenome } from './types.js'

export type GenomeEntry<G extends AnyGenome<G>> = [
  speciesIndex: number,
  organismIndex: number,
  genome: G
]

export type GenomeEntries<G extends AnyGenome<G>> = Iterable<GenomeEntry<G>>
