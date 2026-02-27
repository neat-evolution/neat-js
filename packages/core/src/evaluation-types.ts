import type { Algorithm, CoreGenome, Genome } from './index.js'

export type AnyAlgorithm<
  G extends CoreGenome<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    G
  >,
> = Algorithm<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  G
>

export type AnyGenome<
  G extends Genome<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    G
  >,
> = Genome<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  G
>

export type FitnessData = [
  speciesIndex: number,
  organismIndex: number,
  fitness: number,
]

export type GenomeEntry<G extends AnyGenome<G>> = [
  speciesIndex: number,
  organismIndex: number,
  genome: G,
]

export type GenomeEntries<G extends AnyGenome<G>> = Iterable<GenomeEntry<G>>
