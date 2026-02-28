import type {
  AlgorithmContext,
  ConfigDataOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  GenomeTypeOf,
  StateDataOf,
} from '@neat-evolution/core'

import type { OrganismData } from './OrganismData.js'
import type { OrganismFactoryOptions } from './OrganismFactoryOptions.js'

export class Organism<Ctx extends AlgorithmContext> {
  public readonly genome: GenomeTypeOf<Ctx>
  public readonly generation: number

  public fitness: number | null
  public adjustedFitness: number | null

  constructor(
    genome: GenomeTypeOf<Ctx>,
    generation?: number,
    organismFactoryOptions?: Omit<OrganismFactoryOptions, 'generation'>
  ) {
    this.genome = genome
    this.generation = generation ?? 0
    this.fitness = organismFactoryOptions?.fitness ?? null
    this.adjustedFitness = organismFactoryOptions?.adjustedFitness ?? null
  }

  // Breed organism with other organism
  crossover(other: Organism<Ctx>): Organism<Ctx> {
    return new Organism<Ctx>(
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
  distance(other: Organism<Ctx>): number {
    return this.genome.distance(other.genome)
  }

  // Produce an elite for the next generation
  asElite(): Organism<Ctx> {
    return new Organism<Ctx>(
      this.genome.clone(),
      this.generation + 1
    )
  }

  toJSON(): OrganismData<
    ConfigDataOf<Ctx>,
    StateDataOf<Ctx>,
    any,
    any,
    GenomeFactoryOptionsOf<Ctx>,
    GenomeOptionsOf<Ctx>
  > {
    return {
      genome: this.genome.toJSON(),
      organismState: this.toFactoryOptions(),
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
