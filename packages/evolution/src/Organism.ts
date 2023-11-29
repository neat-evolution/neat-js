import type {
  ConfigData,
  Genome,
  GenomeFactoryOptions,
  GenomeOptions,
  StateData,
} from '@neat-evolution/core'

import type { OrganismData } from './OrganismData.js'
import type { OrganismFactoryOptions } from './OrganismFactoryOptions.js'

export class Organism<
  CD extends ConfigData,
  SD extends StateData,
  HND,
  LD,
  GFO extends GenomeFactoryOptions<HND, LD>,
  GO extends GenomeOptions,
  G extends Genome<
    any,
    any,
    CD,
    any,
    any,
    any,
    any,
    any,
    SD,
    any,
    HND,
    LD,
    GFO,
    GO,
    any,
    G
  >,
> {
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
  crossover(
    other: Organism<CD, SD, HND, LD, GFO, GO, G>
  ): Organism<CD, SD, HND, LD, GFO, GO, G> {
    return new Organism<CD, SD, HND, LD, GFO, GO, G>(
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
  distance(other: Organism<CD, SD, HND, LD, GFO, GO, G>): number {
    return this.genome.distance(other.genome)
  }

  // Produce an elite for the next generation
  asElite(): Organism<CD, SD, HND, LD, GFO, GO, G> {
    return new Organism<CD, SD, HND, LD, GFO, GO, G>(
      this.genome.clone(),
      this.generation + 1
    )
  }

  toJSON(): OrganismData<CD, SD, HND, LD, GFO, GO> {
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
