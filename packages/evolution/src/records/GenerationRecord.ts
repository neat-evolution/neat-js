export interface GenerationRecord {
  iteration: number
  fitness: number | null
  bestFitness: number
  bestIteration: number
  speciesCount: number
  extinctSpeciesCount: number
  speciesSizes: number[]
  hiddenNodes: number
  links: number
  iterationMs: number
  totalMs: number
}
