import type { Genome, GenomeData, GenomeOptions } from '@neat-js/core'

import { type Organism } from './Organism.js'
import type { SpeciesData, SpeciesState } from './SpeciesData.js'
import type { SpeciesFactoryOptions } from './SpeciesFactoryOptions.js'
import type { SpeciesOptions } from './SpeciesOptions.js'

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
    // FIXME: calculate this automatically
    return this.speciesState.bestFitness
  }

  public get elites(): number {
    // FIXME: calculate this automatically
    return this.speciesState.elites
  }

  public set elites(value: number) {
    // FIXME: calculate this automatically
    this.speciesState.elites = value
  }

  public get offsprings(): number {
    // FIXME: calculate this automatically
    return this.speciesState.offsprings
  }

  public set offsprings(value: number) {
    // FIXME: calculate this automatically
    this.speciesState.offsprings = value
  }

  isCompatible(other: Organism<G>): boolean {
    const organism = this.organisms[0]
    if (organism != null) {
      return organism.distance(other) < this.speciesOptions.speciationThreshold
    }
    return true // All organisms are compatible if the species is empty
  }

  push(individual: Organism<G>): void {
    this.organisms.push(individual)
  }

  randomOrganism(): Organism<G> | null {
    const randomIndex = Math.floor(Math.random() * this.organisms.length)
    return this.organisms[randomIndex] ?? null
  }

  adjustFitness(): void {
    if (this.speciesState.locked) throw new Error('Species is locked.')

    const isStagnant =
      this.speciesState.currentAge - this.speciesState.lastImprovement >
      this.speciesOptions.dropoffAge
    const isYoung =
      this.speciesState.currentAge < this.speciesOptions.youngAgeLimit
    const size = this.organisms.length

    for (const organism of this.organisms) {
      let adjustedFitness = organism.fitness ?? 0

      if (isStagnant) {
        adjustedFitness *= this.speciesOptions.stagnantSpeciesFitnessMultiplier
      }

      if (isYoung) {
        adjustedFitness *= this.speciesOptions.youngSpeciesFitnessMultiplier
      }

      adjustedFitness /= size

      if (adjustedFitness <= 0.0 || !isFinite(adjustedFitness)) {
        adjustedFitness = 0.0001
      }

      organism.adjustedFitness = adjustedFitness
    }

    // Sort organisms descendingly by adjusted fitness
    this.organisms.sort((a, b) => {
      // Both null or undefined
      if (a.adjustedFitness === null && b.adjustedFitness === null) {
        return 0
      }

      // One of them is null or undefined
      if (a.adjustedFitness === null) {
        return 1 // or whatever value makes sense in your context to say "a is greater than b"
      }

      if (b.adjustedFitness === null) {
        return -1 // or whatever value makes sense in your context to say "b is greater than a"
      }

      // Both are numbers: perform the subtraction
      return b.adjustedFitness - a.adjustedFitness
    })

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
    if (this.speciesState.locked) throw new Error('Species is already locked.')

    this.speciesState.lockedOrganisms = this.organisms.length
    this.speciesState.locked = true
  }

  age(): void {
    this.lock()
    this.speciesState.currentAge++
  }

  // Remove all the locked organisms (the old generation), and retain the organisms pushed after lock (next generation)
  removeOld(): void {
    if (!this.speciesState.locked) throw new Error('Species is not locked.')

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
    if (this.speciesState.locked) throw new Error('Species is locked.')

    let sum = 0
    for (const organism of this.organisms) {
      sum += (organism.adjustedFitness ?? 0) / avgFitness
    }
    this.speciesState.offsprings = sum

    this.speciesState.elites = this.speciesOptions.guaranteedElites
  }

  tournamentSelect(k: number): Organism<G> | null {
    let best: Organism<G> | null = null
    let bestFitness = Number.NEGATIVE_INFINITY

    for (let i = 0; i < k; i++) {
      const organism = this.randomOrganism()
      const fitness = organism?.fitness ?? -Number.MAX_VALUE
      if (fitness > bestFitness) {
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
