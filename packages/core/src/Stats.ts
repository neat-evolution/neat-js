export type Stats = any

export class OrganismStats<G, P, E> {
  public readonly fitness: number
  public readonly genome: G
  public readonly phenotype: P
  public readonly evaluation: E

  constructor(fitness: number, genome: G, phenotype: P, evaluation: E) {
    this.fitness = fitness
    this.genome = genome
    this.phenotype = phenotype
    this.evaluation = evaluation
  }
}

export class PopulationStats<G, P, E> {
  public readonly organisms: Array<OrganismStats<G, P, E>>

  constructor(organisms: Array<OrganismStats<G, P, E>>) {
    this.organisms = organisms
  }

  // Corresponding to `fn best(&self) -> Option<&OrganismStats<Self::G, Self::P, Self::E>>`
  best(): OrganismStats<G, P, E> | null {
    if (this.organisms.length === 0) return null
    return this.organisms.reduce((a, b) => (a.fitness > b.fitness ? a : b))
  }
}
