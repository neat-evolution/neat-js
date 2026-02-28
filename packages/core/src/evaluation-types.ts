import type { Algorithm, AlgorithmContext, Genome } from './index.js'

export type AnyAlgorithm<Ctx extends AlgorithmContext = AlgorithmContext> =
  Algorithm<Ctx>

export type AnyGenome<Ctx extends AlgorithmContext = AlgorithmContext> =
  Genome<Ctx>

export type FitnessData = [
  speciesIndex: number,
  organismIndex: number,
  fitness: number,
]

export type GenomeEntry<G extends AnyGenome<any>> = [
  speciesIndex: number,
  organismIndex: number,
  genome: G,
]

export type GenomeEntries<G extends AnyGenome<any>> = Iterable<GenomeEntry<G>>
