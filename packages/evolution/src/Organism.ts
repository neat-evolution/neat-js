import type { Genome } from '@neat-js/core'

import type { OrganismData } from './OrganismData.js'
import type { OrganismFactoryOptions } from './OrganismFactoryOptions.js'

export class Organism<G extends Genome<any, any, any, any, any, any, any, G>> {
  public readonly genome: G
  public readonly generation: number

  public fitness: number | null
  public adjustedFitness: number | null

  constructor(
    genome: G,
    generation?: number,
    organismFactoryOptions?: Omit<OrganismFactoryOptions, 'generation'>
  ) {
    this.genome = genome
    this.generation = generation ?? 0

    this.fitness = organismFactoryOptions?.fitness ?? null
    this.adjustedFitness = organismFactoryOptions?.adjustedFitness ?? null
  }

  // Breed organism with other organism
  crossover(other: Organism<G>): Organism<G> {
    return new Organism<G>(
      this.genome.crossover(
        other.genome,
        // FIXME: is it correct to cast to zero here?
        this.fitness ?? 0,
        other.fitness ?? 0
      ),
      this.generation + 1
    )
  }

  // Mutate organism
  async mutate(): Promise<void> {
    await this.genome.mutate()
  }

  // Genetic distance to other organism
  distance(other: Organism<G>): number {
    return this.genome.distance(other.genome)
  }

  // Produce an elite for the next generation
  asElite(): Organism<G> {
    return new Organism<G>(this.genome.clone(), this.generation + 1)
  }

  toJSON(): OrganismData<any, G> {
    return {
      genome: this.genome.toJSON(),
      organismState: {
        generation: this.generation,
        fitness: this.fitness,
        adjustedFitness: this.adjustedFitness,
      },
    }
  }

  toFactoryOptions(): OrganismFactoryOptions {
    return {
      generation: this.generation,
      fitness: this.fitness,
      adjustedFitness: this.adjustedFitness,
    }
  }
}
