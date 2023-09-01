import type { Genome, GenomeData } from '@neat-js/core'

// FIXME: Add OrganismFactoryOptions
export interface OrganismData<G extends Genome<any, any, any, any, any, G>> {
  genome: GenomeData<
    any,
    any,
    any,
    G['options'],
    ReturnType<G['toFactoryOptions']>,
    G
  >
  fitness: number | null
  adjustedFitness: number | null
  generation: number
}

export class Organism<G extends Genome<any, any, any, any, any, G>> {
  public readonly genome: G

  public fitness: number | null
  public adjustedFitness: number | null
  public readonly generation: number

  constructor(
    genome: G,
    generation: number = 0,
    fitness?: number | null,
    adjustedFitness?: number | null
  ) {
    this.genome = genome
    this.fitness = fitness ?? null
    this.adjustedFitness = adjustedFitness ?? null
    this.generation = generation
  }

  // Breed organism with other organism
  crossover(other: Organism<G>): Organism<G> {
    return new Organism<G>(
      this.genome.crossover(
        other.genome,
        this.fitness ?? 0,
        other.fitness ?? 0
      ),
      this.generation + 1
    )
  }

  // Compare to other organism based on non-adjusted fitness
  cmp(other: Organism<G>): number {
    // Handle cases where fitness is null or undefined
    if (this.fitness == null || other.fitness == null) {
      throw new Error('Fitness cannot be null or undefined')
    }

    // Handle NaN cases
    if (isNaN(this.fitness) || isNaN(other.fitness)) {
      throw new Error('Fitness cannot be NaN')
    }

    const difference = this.fitness - other.fitness

    if (difference < 0) {
      return -1
    } else if (difference === 0) {
      return 0
    } else {
      return 1
    }
  }

  // Mutate organism
  mutate(): void {
    this.genome.mutate()
  }

  // Genetic distance to other organism
  distance(other: Organism<G>): number {
    // FIXME: why is distance optional on a genome?
    return this.genome.distance?.(other.genome) ?? 0
  }

  // Produce an elite for the next generation
  asElite(): Organism<G> {
    return new Organism<G>(this.genome.clone(), this.generation + 1)
  }

  toJSON(): OrganismData<G> {
    return {
      genome: this.genome.toJSON(),
      fitness: this.fitness,
      adjustedFitness: this.adjustedFitness,
      generation: this.generation,
    }
  }
}
