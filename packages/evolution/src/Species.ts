import type { Genome, GenomeData, GenomeFactoryOptions } from '@neat-js/core'

import type { GenomeDataParser } from './GenomeDataParser.js'
import { Organism } from './Organism.js'
import type { OrganismData } from './Organism.js'
import type { SpeciesOptions } from './SpeciesOptions.js'

// FIXME: Add SpeciesFactoryOptions
export interface SpeciesData<G extends Genome<any, any, any, any, any, G>> {
  options?: SpeciesOptions
  currentAge: number
  bestFitness: number
  lifetimeBestFitness: number
  lastImprovement: number
  offsprings: number
  elites: number
  organisms: Array<OrganismData<G>>
  extinct: boolean
  locked: boolean
  lockedOrganisms: number
}

export class Species<
  FO extends GenomeFactoryOptions,
  G extends Genome<any, any, any, any, FO, G>,
  GD extends GenomeData<any, any, any, any, FO, G>
> {
  public readonly options: SpeciesOptions

  // internal state
  public currentAge: number
  public bestFitness: number
  public lifetimeBestFitness: number
  public lastImprovement: number
  public offsprings: number
  public elites: number
  public extinct: boolean
  private locked: boolean
  private lockedOrganisms: number

  // organism set
  public organisms: Array<Organism<G>>

  constructor(
    options: SpeciesOptions,
    parseGenomeData: GenomeDataParser<G['options'], FO, G, GD>,
    // FIXME: use factoryOptions here
    data?: SpeciesData<G>
  ) {
    this.options = options
    this.currentAge = data?.currentAge ?? 0
    this.bestFitness = data?.bestFitness ?? 0.0
    this.lifetimeBestFitness = data?.lifetimeBestFitness ?? 0.0
    this.lastImprovement = data?.lastImprovement ?? 0
    this.offsprings = data?.offsprings ?? 0.0
    this.elites = data?.elites ?? 0
    this.organisms = []
    this.extinct = data?.extinct ?? false
    this.locked = data?.locked ?? false
    this.lockedOrganisms = data?.lockedOrganisms ?? 0

    if (data != null && parseGenomeData == null) {
      throw new Error('Missing genome data parser.')
    }
    // FIXME: use factoryOptions here
    // This was half implemented
    // - OrganismFactoryOptions
    // - GenomeFactoryOptions
    if (data?.organisms != null && parseGenomeData != null) {
      this.organisms = []

      for (const organismData of data.organisms) {
        // FIXME: casting to FO here is not explicit enough to prevent errors
        const genome = parseGenomeData(organismData.genome as GD)
        const organism = new Organism<G>(
          genome,
          organismData.generation,
          organismData.fitness,
          organismData.adjustedFitness
        )
        this.organisms.push(organism)
      }
    }
  }

  isCompatible(other: Organism<G>): boolean {
    const organism = this.organisms[0]
    if (organism != null) {
      return organism.distance(other) < this.options.speciationThreshold
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
    if (this.locked) throw new Error('Species is locked.')

    const isStagnant =
      this.currentAge - this.lastImprovement > this.options.dropoffAge
    const isYoung = this.currentAge < this.options.youngAgeLimit
    const size = this.organisms.length

    for (const organism of this.organisms) {
      let adjustedFitness = organism.fitness ?? 0

      if (isStagnant) {
        adjustedFitness *= this.options.stagnantSpeciesFitnessMultiplier
      }

      if (isYoung) {
        adjustedFitness *= this.options.youngSpeciesFitnessMultiplier
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

    this.bestFitness = this.organisms[0]?.fitness ?? 0.0
    if (this.bestFitness > this.lifetimeBestFitness) {
      this.lifetimeBestFitness = this.bestFitness
      this.lastImprovement = this.currentAge
    }
  }

  // Retain only the best individuals
  retainBest(): void {
    if (this.locked) throw new Error('Species is locked.')

    const newSize = Math.round(
      this.organisms.length * this.options.survivalRatio
    )
    const truncateSize = Math.max(Math.max(newSize, this.elites), 2)

    // Assumes the individuals are sorted in descending fitness order
    // Keep a minimum of two individuals for sexual reproduction
    this.organisms.splice(truncateSize)
  }

  lock(): void {
    if (this.locked) throw new Error('Species is already locked.')

    this.lockedOrganisms = this.organisms.length
    this.locked = true
  }

  age(): void {
    this.lock()
    this.currentAge++
  }

  // Remove all the locked organisms (the old generation), and retain the organisms pushed after lock (next generation)
  removeOld(): void {
    if (!this.locked) throw new Error('Species is not locked.')

    this.locked = false

    if (this.lockedOrganisms < this.organisms.length) {
      this.organisms.splice(0, this.lockedOrganisms)
    } else {
      // No new individuals were added, species is now extinct
      this.organisms.splice(1)
      this.extinct = true
    }
  }

  calculateOffsprings(avgFitness: number): void {
    if (this.locked) throw new Error('Species is locked.')

    let sum = 0
    for (const organism of this.organisms) {
      sum += (organism.adjustedFitness ?? 0) / avgFitness
    }
    this.offsprings = sum

    this.elites = this.options.guaranteedElites
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

  toJSON(): SpeciesData<G> {
    return {
      options: this.options,
      currentAge: this.currentAge,
      bestFitness: this.bestFitness,
      lifetimeBestFitness: this.lifetimeBestFitness,
      lastImprovement: this.lastImprovement,
      offsprings: this.offsprings,
      elites: this.elites,
      organisms: this.organisms.map((organism) => organism.toJSON()),
      extinct: this.extinct,
      locked: this.locked,
      lockedOrganisms: this.lockedOrganisms,
    }
  }
}
