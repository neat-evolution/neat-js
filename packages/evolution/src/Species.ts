import { type Genome, type GenomeData, type GenomeOptions } from '@neat-js/core'
import { threadRNG } from '@neat-js/utils'

import { type Organism } from './Organism.js'
import type { SpeciesData, SpeciesState } from './SpeciesData.js'
import type { SpeciesFactoryOptions } from './SpeciesFactoryOptions.js'
import type { SpeciesOptions } from './SpeciesOptions.js'

/// Collection of similar organisms
// The lock is used to add new organisms without affecting the reproduction of the previous generation.
// It is unlocked after reproduction, which will remove the previous generation and keep the new.
export class Species<
  GO extends GenomeOptions,
  GD extends GenomeData<GO, G>,
  G extends Genome<any, any, any, any, GO, any, GD, G>
> {
  public readonly speciesOptions: SpeciesOptions

  // internal state
  public readonly speciesState: SpeciesState

  // organism set
  public organisms: Array<Organism<G>>

  constructor(
    speciesOptions: SpeciesOptions,
    speciesFactoryOptions?: SpeciesFactoryOptions<G>
  ) {
    this.speciesOptions = speciesOptions
    const speciesState = speciesFactoryOptions?.speciesState
    this.speciesState = {
      currentAge: speciesState?.currentAge ?? 0,
      bestFitness: speciesState?.bestFitness ?? 0,
      lifetimeBestFitness: speciesState?.lifetimeBestFitness ?? 0,
      lastImprovement: speciesState?.lastImprovement ?? 0,
      offsprings: speciesState?.offsprings ?? 0,
      elites: speciesState?.elites ?? 0,
      extinct: speciesState?.extinct ?? false,
      locked: speciesState?.locked ?? false,
      lockedOrganisms: speciesState?.lockedOrganisms ?? 0,
    }
    this.organisms = speciesFactoryOptions?.organisms ?? []
  }

  public get extinct(): boolean {
    return this.speciesState.extinct
  }

  public set extinct(value: boolean) {
    this.speciesState.extinct = value
  }

  public get bestFitness(): number {
    return this.speciesState.bestFitness
  }

  public get elites(): number {
    return this.speciesState.elites
  }

  public set elites(value: number) {
    this.speciesState.elites = value
  }

  public get offsprings(): number {
    return this.speciesState.offsprings
  }

  public set offsprings(value: number) {
    this.speciesState.offsprings = value
  }

  /// Determine wether a new organism is compatible
  isCompatible(other: Organism<G>): boolean {
    const organism = this.organisms[0]
    if (organism != null) {
      return organism.distance(other) < this.speciesOptions.speciationThreshold
    }
    return true // All organisms are compatible if the species is empty
  }

  /// Add an organism
  push(individual: Organism<G>): void {
    this.organisms.push(individual)
  }

  /// Number of organisms. Adheres to lock.
  get size(): number {
    if (this.speciesState.locked) {
      return this.speciesState.lockedOrganisms
    } else {
      return this.organisms.length
    }
  }

  /// Iterate organisms. Adheres to lock.
  *organismValues(): Generator<Organism<G>, void, void> {
    const size = this.size
    for (let i = 0; i < size; i++) {
      const organism = this.organisms[i]
      if (organism == null) {
        throw new Error('Organism is null')
      }
      yield organism
    }
  }

  /// Enumerate organisms. Adheres to lock.
  *organismEntries(): Generator<
    [index: number, organism: Organism<G>],
    void,
    void
  > {
    const size = this.size
    for (let i = 0; i < size; i++) {
      const organism = this.organisms[i]
      if (organism == null) {
        throw new Error('Organism is null')
      }
      yield [i, organism]
    }
  }

  /// Get random organism. Adheres to lock.
  randomOrganism(): Organism<G> | null {
    const randomIndex = threadRNG().genRange(0, this.size)
    let i = 0
    for (const organism of this.organismValues()) {
      if (i === randomIndex) {
        return organism
      }
      i++
    }
    return null
  }

  adjustFitness(): void {
    if (this.speciesState.locked) {
      throw new Error('Species is locked.')
    }

    const isStagnant =
      this.speciesState.currentAge - this.speciesState.lastImprovement >
      this.speciesOptions.dropoffAge
    const isYoung =
      this.speciesState.currentAge < this.speciesOptions.youngAgeLimit
    const size = this.organisms.length

    for (const organism of this.organisms.values()) {
      let adjustedFitness = organism.fitness
      if (adjustedFitness == null) {
        throw new Error('Organism fitness is null')
      }

      // Greatly penalize stagnant species
      if (isStagnant) {
        adjustedFitness *= this.speciesOptions.stagnantSpeciesFitnessMultiplier
      }

      // Boost young species
      if (isYoung) {
        adjustedFitness *= this.speciesOptions.youngSpeciesFitnessMultiplier
      }

      // Share fitness within species
      adjustedFitness /= size

      // Avoid zero fitness
      if (adjustedFitness <= 0.0 || !isFinite(adjustedFitness)) {
        adjustedFitness = 0.0001
      }

      organism.adjustedFitness = adjustedFitness
    }

    // Sort organisms descendingly by adjusted fitness (best first)
    this.organisms.sort((a, b) => {
      const aValue = a.adjustedFitness ?? -Infinity
      const bValue = b.adjustedFitness ?? -Infinity
      const compare = aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      return compare
    })

    // Update best fitness and last improvement if currently best in lifetime
    this.speciesState.bestFitness = this.organisms[0]?.fitness ?? 0.0
    if (this.speciesState.bestFitness > this.speciesState.lifetimeBestFitness) {
      this.speciesState.lifetimeBestFitness = this.speciesState.bestFitness
      this.speciesState.lastImprovement = this.speciesState.currentAge
    }
  }

  // Retain only the best individuals
  retainBest(): void {
    if (this.speciesState.locked) throw new Error('Species is locked.')

    const newSize = Math.round(
      this.organisms.length * this.speciesOptions.survivalRatio
    )
    const truncateSize = Math.max(
      Math.max(newSize, this.speciesState.elites),
      2
    )

    // Assumes the individuals are sorted in descending fitness order
    // Keep a minimum of two individuals for sexual reproduction
    this.organisms.splice(truncateSize)
  }

  lock(): void {
    if (this.speciesState.locked) {
      throw new Error('Species is already locked.')
    }

    this.speciesState.lockedOrganisms = this.organisms.length
    this.speciesState.locked = true
  }

  age(): void {
    this.lock()
    this.speciesState.currentAge++
  }

  // Remove all the locked organisms (the old generation), and retain the organisms pushed after lock (next generation)
  removeOld(): void {
    if (!this.speciesState.locked) {
      throw new Error('Species is not locked.')
    }

    this.speciesState.locked = false

    if (this.speciesState.lockedOrganisms < this.organisms.length) {
      this.organisms.splice(0, this.speciesState.lockedOrganisms)
    } else {
      // No new individuals were added, species is now extinct
      this.organisms.splice(1)
      this.speciesState.extinct = true
    }
  }

  calculateOffsprings(avgFitness: number): void {
    if (this.speciesState.locked) {
      throw new Error('Species is locked.')
    }

    this.speciesState.offsprings = 0
    for (const organism of this.organisms) {
      if (organism.adjustedFitness == null) {
        throw new Error('Organism adjusted fitness is null')
      }
      this.speciesState.offsprings += organism.adjustedFitness / avgFitness
    }

    this.speciesState.elites = this.speciesOptions.guaranteedElites
  }

  tournamentSelect(k: number): Organism<G> | null {
    let best: Organism<G> | null = null
    let bestFitness: number | null = null

    for (let i = 0; i < k; i++) {
      const organism = this.randomOrganism()
      const fitness = organism?.fitness ?? null
      if (
        best === null ||
        (bestFitness === null && fitness !== null) ||
        (bestFitness !== null && fitness !== null && fitness > bestFitness)
      ) {
        best = organism
        bestFitness = fitness
      }
    }

    return best
  }

  toJSON(): SpeciesData<GO, GD, G> {
    const config = this.organisms[0]?.genome.config.toJSON() ?? null
    const state = this.organisms[0]?.genome.state.toJSON() ?? null
    const genomeOptions = this.organisms[0]?.genome.genomeOptions ?? null
    return {
      // species state
      speciesOptions: this.speciesOptions,
      speciesState: this.speciesState,

      // to recreate the genomes
      config,
      state,
      genomeOptions,

      // to recreate the organisms
      organisms: this.organisms.map((organism) => {
        return {
          organismState: organism.toFactoryOptions(),
          genome: organism.genome.toFactoryOptions(),
        }
      }),
    }
  }

  toFactoryOptions(): SpeciesFactoryOptions<G> {
    return {
      speciesState: this.speciesState,
      organisms: this.organisms,
    }
  }
}
