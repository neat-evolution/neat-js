import type { Genome, GenomeData } from '@neat-js/core'
import type { GenomeFactory } from '@neat-js/core'
import type { GenomeOptions } from '@neat-js/core'
import type { StateFactory } from '@neat-js/core'
import type { StateProvider } from '@neat-js/core'
import type { Evaluator, PhenotypeData } from '@neat-js/evaluator'
import type { PhenotypeFactory } from '@neat-js/phenotype'

import { Organism } from './Organism.js'
import {
  defaultPopulationOptions,
  type PopulationOptions,
} from './PopulationOptions.js'
import { Species, type GenomeDataParser } from './Species.js'

export class Population<
  GO extends GenomeOptions,
  G extends Genome<any, any, any, GO, G>,
  GD extends GenomeData<any, any, any, GO, G>
> {
  species: Map<number, Species<G, GD>>
  extinctSpecies: Map<number, Species<G, GD>>
  state: StateProvider<any, any>
  nextId: number

  createPhenotype: PhenotypeFactory<G>
  createGenome: GenomeFactory<GO, G, GD>
  createState: StateFactory<any, any, any>
  parseGenomeData: GenomeDataParser<GO, G, GD>
  evaluator: Evaluator

  populationOptions: PopulationOptions
  NEATOptions: G['config']
  genomeOptions: GO

  constructor(
    evaluator: Evaluator,
    createPhenotype: PhenotypeFactory<G>,
    createGenome: GenomeFactory<GO, G, GD>,
    createState: StateFactory<any, any, any>,
    populationOptions: PopulationOptions = defaultPopulationOptions,
    NEATOptions: G['config'],
    genomeOptions: GO
  ) {
    this.species = new Map<number, Species<G, GD>>()
    this.extinctSpecies = new Map<number, Species<G, GD>>()
    this.nextId = 0
    this.evaluator = evaluator

    this.createPhenotype = createPhenotype
    this.createGenome = createGenome
    this.createState = createState
    this.parseGenomeData = (data: GD) =>
      createGenome(NEATOptions, genomeOptions, this.state, data)

    this.populationOptions = populationOptions
    this.NEATOptions = NEATOptions
    this.genomeOptions = genomeOptions

    this.state = this.createState()
    for (let i = 0; i < this.populationOptions.populationSize; i++) {
      const genome = createGenome(
        this.NEATOptions,
        {
          ...this.genomeOptions,
          ...this.evaluator.environment.description,
        },
        this.state
      )
      this.push(new Organism<G>(genome), false)
    }
  }

  *organismEntries(): IterableIterator<
    [speciesIndex: number, organismIndex: number, organism: Organism<G>]
  > {
    for (const [speciesIndex, species] of this.species.entries()) {
      for (const [organismIndex, organism] of species.organisms.entries()) {
        yield [speciesIndex, organismIndex, organism]
      }
    }
  }

  *organismValues(): IterableIterator<Organism<G>> {
    for (const [, , organism] of this.organismEntries()) {
      yield organism
    }
  }

  push(organism: Organism<G>, lockNew: boolean): void {
    let species = this.compatibleSpecies(organism)
    if (species != null) {
      species.push(organism)
    } else {
      species = new Species<G, GD>(this.populationOptions, this.parseGenomeData)
      if (lockNew) {
        species.lock()
      }
      species.push(organism)
      this.species.set(this.nextId, species)
      this.nextId += 1
    }
  }

  private compatibleSpecies(organism: Organism<G>): Species<G, GD> | null {
    for (const species of this.species.values()) {
      if (species.isCompatible(organism)) {
        return species
      }
    }
    return null
  }

  evolve(): void {
    // Adjust fitnesses based on age, stagnation and apply fitness sharing
    // Also sorts organisms by descending fitness
    for (const species of this.species.values()) {
      species.adjustFitness()
    }

    const elites =
      this.populationOptions.globalElites +
      this.populationOptions.guaranteedElites * this.species.size

    // Average fitness of all organisms
    const organisms = Array.from(this.organismValues())
    const avgFitness =
      organisms
        .map((o) => o.adjustedFitness ?? 0)
        .reduce((acc, v) => acc + v, 0) /
      (this.populationOptions.populationSize - elites)

    for (const species of this.species.values()) {
      species.calculateOffsprings(avgFitness)
    }

    let newPopulationSize =
      Array.from(this.species.values())
        .map((s) => Math.floor(s.offsprings))
        .reduce((acc, v) => acc + v, 0) + elites

    const speciesIds = Array.from(this.species.keys())

    // Sort species based on closeness to additional offspring
    speciesIds.sort(
      (a, b) =>
        1 -
        ((this.species.get(a) as Species<G, GD>).offsprings % 1) -
        (1 - ((this.species.get(b) as Species<G, GD>).offsprings % 1))
    )

    while (newPopulationSize < this.populationOptions.populationSize) {
      for (const speciesId of speciesIds) {
        const species = this.species.get(speciesId) as Species<G, GD>
        species.offsprings = Math.floor(species.offsprings) + 1
        newPopulationSize++

        if (newPopulationSize === this.populationOptions.populationSize) {
          break
        }
      }
    }

    // Sort species based on bestFitness (best first)
    speciesIds.sort((a, b) => {
      return (
        ((this.species.get(b) as Species<G, GD>).bestFitness ?? 0) -
        ((this.species.get(a) as Species<G, GD>).bestFitness ?? 0)
      )
    })

    let elitesDistributed = 0
    while (elitesDistributed < this.populationOptions.globalElites) {
      for (const speciesId of speciesIds) {
        const species = this.species.get(speciesId) as Species<G, GD>
        if (species.elites < species.organisms.length) {
          species.elites++
          elitesDistributed++

          if (elitesDistributed === this.populationOptions.globalElites) {
            break
          }
        }
      }
    }

    // I'm going to assume we have a helper function to sum up offsprings and elites for validation
    const totalOffspringAndElites = Array.from(this.species.values())
      .map((s) => Math.floor(s.offsprings) + s.elites)
      .reduce((acc, v) => acc + v, 0)
    if (totalOffspringAndElites !== this.populationOptions.populationSize) {
      throw new Error('Wrong number of planned individuals in next population')
    }

    // Kill individuals of low performance, not allowed to reproduce
    for (const species of this.species.values()) {
      species.retainBest()
    }

    // Increase the age of and lock all species, making current organisms old
    for (const species of this.species.values()) {
      species.age()
    }

    for (const i of speciesIds) {
      const species = this.species.get(i) as Species<G, GD>

      // Steal elites from number of offsprings
      const elitesTakenFromOffspring = Math.min(
        this.populationOptions.elitesFromOffspring,
        Math.floor(species.offsprings)
      )
      species.elites += elitesTakenFromOffspring
      species.offsprings -= elitesTakenFromOffspring

      // Directly copy elites, without crossover or mutation
      for (let j = 0; j < species.elites; j++) {
        this.push(
          (
            species.organisms[j % species.organisms.length] as Organism<G>
          ).asElite(),
          true
        )
      }
    }

    // Evolve species
    for (const i of speciesIds) {
      const species = this.species.get(i) as Species<G, GD>
      const reproductions = Math.floor(species.offsprings)

      // Breed new organisms
      for (let _ = 0; _ < reproductions; _++) {
        const father =
          Math.random() <
          this.populationOptions.interspeciesReproductionProbability
            ? this.tournamentSelect(
                this.populationOptions.interspeciesTournamentSize
              )
            : species.tournamentSelect(this.populationOptions.tournamentSize)

        if (father == null) {
          throw new Error('Unable to gather father organism')
        }

        let child: Organism<G>
        if (
          Math.random() < this.populationOptions.asexualReproductionProbability
        ) {
          child = father.asElite()
        } else {
          const mother = species.tournamentSelect(
            this.populationOptions.tournamentSize
          )
          if (mother == null) {
            throw new Error('Unable to gather mother organism')
          }
          child = mother.crossover(father)
        }

        child.mutate()
        this.push(child, true)
      }
    }

    // Kill old population
    for (const species of this.species.values()) {
      species.removeOld()
    }

    // Remove extinct species
    for (const i of speciesIds) {
      const species = this.species.get(i)
      if (species?.extinct === true) {
        this.species.delete(i)
        this.extinctSpecies.set(i, species)
      }
    }

    // Verify correct number of individuals in new population
    if (
      Array.from(this.organismValues()).length !==
      this.populationOptions.populationSize
    ) {
      throw new Error('Wrong number of individuals in population')
    }

    if (this.populationOptions.speciesTarget > 0) {
      if (this.species.size < this.populationOptions.speciesTarget) {
        this.populationOptions.speciationThreshold -=
          this.populationOptions.speciationThresholdMoveAmount
      } else if (this.species.size > this.populationOptions.speciesTarget) {
        this.populationOptions.speciationThreshold +=
          this.populationOptions.speciationThresholdMoveAmount
      }
      this.populationOptions.speciationThreshold = Math.max(
        this.populationOptions.speciationThreshold,
        0
      )
    }
  }

  mutate() {
    for (const organism of this.organismValues()) {
      organism.mutate()
    }
  }

  randomOrganism(): Organism<G> | null {
    const organisms = Array.from(this.organismValues())
    const len = organisms.length

    if (len === 0) {
      return null
    } else {
      return organisms[Math.floor(Math.random() * len)] ?? null
    }
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

  async evaluate() {
    const phenotypeData = new Set<PhenotypeData>()

    // convert every organism to a phenotype
    for (const [
      speciesIndex,
      organismIndex,
      organism,
    ] of this.organismEntries()) {
      phenotypeData.add([
        speciesIndex,
        organismIndex,
        this.createPhenotype(organism.genome),
      ])
    }

    // evaluate every organism
    for await (const result of this.evaluator.evaluate(phenotypeData)) {
      const [speciesIndex, organismIndex, fitness] = result
      const species = this.species.get(speciesIndex)
      if (species == null) {
        throw new Error(`Species ${speciesIndex} not found`)
      }

      const organism = species.organisms[organismIndex]
      if (organism == null) {
        throw new Error(`Organism ${organismIndex} not found`)
      }
      organism.fitness = fitness
    }
  }

  best(): Organism<G> | undefined {
    const organisms = Array.from(this.organismValues())
    return organisms.sort((a, b) => (b.fitness ?? 0) - (a.fitness ?? 0))[0]
  }
}
