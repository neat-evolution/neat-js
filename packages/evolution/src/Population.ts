import type {
  Genome,
  GenomeFactoryOptions,
  GenomeOptions,
  GenomeData,
  ConfigProvider,
  NodeExtension,
  LinkExtension,
  StateProvider,
} from '@neat-js/core'
import type { Evaluator } from '@neat-js/evaluator'
import type { PhenotypeData } from '@neat-js/phenotype'

import type { Algorithm } from './Algorithm.js'
import { Organism } from './Organism.js'
import type { OrganismState } from './OrganismData.js'
import {
  toPopulationDataSpecies,
  type PopulationData,
  type PopulationDataSpeciesEntry,
  type PopulationDataSpecies,
} from './PopulationData.js'
import type { PopulationFactoryOptions } from './PopulationFactoryOptions.js'
import type { PopulationOptions } from './PopulationOptions.js'
import { Species } from './Species.js'

export type BoundConfigFactory<C extends ConfigProvider<any, any>> = () => C

// FIXME: Add PopulationData and PopulationFactoryOptions
export class Population<
  N extends NodeExtension<any, any, N>,
  L extends LinkExtension<any, any, L>,
  C extends ConfigProvider<N['config'], L['config']>,
  S extends StateProvider<N['state'], L['state'], S>,
  GO extends GenomeOptions,
  GFO extends GenomeFactoryOptions<C, S, GO, GFO, GD, G>,
  GD extends GenomeData<GO, G>,
  G extends Genome<N, L, C, S, GO, GFO, GD, G>,
  A extends Algorithm<N, L, C, S, GO, GFO, GD, G>
> {
  public readonly evaluator: Evaluator
  public readonly algorithm: A
  public readonly configProvider: G['config']
  public readonly stateProvider: G['state']

  public readonly species: Map<number, Species<GO, GD, G>>
  public readonly extinctSpecies: Map<number, Species<GO, GD, G>>
  private nextId: number

  public readonly populationOptions: PopulationOptions
  public readonly genomeOptions: GO

  constructor(
    evaluator: Evaluator,
    algorithm: A,
    configProvider: G['config'],
    populationOptions: PopulationOptions,
    genomeOptions: GO,
    populationFactoryOptions?: PopulationFactoryOptions<GO, GD, G>
  ) {
    this.evaluator = evaluator
    this.algorithm = algorithm
    this.configProvider = configProvider
    this.stateProvider = algorithm.createState(
      populationFactoryOptions?.state.neat
    )

    this.species = new Map<number, Species<GO, GD, G>>()
    this.extinctSpecies = new Map<number, Species<GO, GD, G>>()
    this.nextId = populationFactoryOptions?.nextId ?? 0

    this.populationOptions = populationOptions
    this.genomeOptions = genomeOptions

    if (populationFactoryOptions != null) {
      const hydrateOrganism = (
        genomeFactoryOptions: Omit<GD, 'config' | 'state' | 'genomeOptions'>,
        organismFactoryOptions: OrganismState
      ) => {
        const genome = algorithm.createGenome(
          configProvider,
          this.stateProvider,
          {
            ...this.genomeOptions,
            ...this.evaluator.environment.description,
          },
          genomeFactoryOptions as GFO
        )
        const organism = new Organism(
          genome,
          organismFactoryOptions.generation,
          organismFactoryOptions
        )
        return organism
      }
      const hydrateSpecies = (
        speciesMap: Map<number, Species<GO, GD, G>>,
        id: number,
        speciesData: PopulationDataSpecies<GO, GD, G>
      ) => {
        const organisms = []
        for (const {
          genome: genomeFactoryOptions,
          organismState: organismFactoryOptions,
        } of speciesData.organisms) {
          organisms.push(
            hydrateOrganism(genomeFactoryOptions, organismFactoryOptions)
          )
        }
        const speciesFactoryOptions = {
          organisms,
          speciesState: speciesData.speciesState,
        }
        speciesMap.set(
          id,
          new Species(this.populationOptions, speciesFactoryOptions)
        )
      }
      for (const [id, speciesData] of populationFactoryOptions.species) {
        hydrateSpecies(this.species, id, speciesData)
      }
      for (const [id, speciesData] of populationFactoryOptions.extinctSpecies) {
        hydrateSpecies(this.extinctSpecies, id, speciesData)
      }
      // FIXME: ensure enough organisms
    } else {
      for (let i = 0; i < this.populationOptions.populationSize; i++) {
        const genome = algorithm.createGenome(
          configProvider,
          this.stateProvider,
          {
            ...this.genomeOptions,
            ...this.evaluator.environment.description,
          }
        )
        this.push(new Organism<G>(genome), false)
      }
    }
  }

  *genomeEntries(): IterableIterator<
    [speciesIndex: number, organismIndex: number, genome: G]
  > {
    for (const [speciesIndex, { organisms }] of this.species.entries()) {
      for (const [organismIndex, { genome }] of organisms.entries()) {
        yield [speciesIndex, organismIndex, genome]
      }
    }
  }

  *organismValues(): IterableIterator<Organism<G>> {
    for (const { organisms } of this.species.values()) {
      for (const organism of organisms.values()) {
        yield organism
      }
    }
  }

  public get size(): number {
    let size = 0
    for (const species of this.species.values()) {
      size += species.organisms.length
    }
    return size
  }

  // FIXME: rename to add
  push(organism: Organism<G>, lockNew: boolean): void {
    let species = this.compatibleSpecies(organism)
    if (species != null) {
      species.push(organism)
    } else {
      species = new Species<GO, GD, G>(this.populationOptions)
      if (lockNew) {
        species.lock()
      }
      species.push(organism)
      this.species.set(this.nextId, species)
      this.nextId += 1
    }
  }

  private compatibleSpecies(organism: Organism<G>): Species<GO, GD, G> | null {
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
    let sumAdjustedFitness = 0
    for (const { adjustedFitness } of this.organismValues()) {
      sumAdjustedFitness += adjustedFitness ?? 0
    }
    const avgFitness =
      sumAdjustedFitness / (this.populationOptions.populationSize - elites)

    for (const species of this.species.values()) {
      species.calculateOffsprings(avgFitness)
    }

    let sumOffsprings = 0
    for (const species of this.species.values()) {
      sumOffsprings += Math.floor(species.offsprings)
    }
    let newPopulationSize = sumOffsprings + elites

    const speciesIds = Array.from(this.species.keys())

    // Sort speciesIds array
    speciesIds.sort((a, b) => {
      const fractionA =
        (this.species.get(a) as Species<GO, GD, G>).offsprings % 1
      const fractionB =
        (this.species.get(b) as Species<GO, GD, G>).offsprings % 1

      return 1 - fractionB - (1 - fractionA)
    })

    while (newPopulationSize < this.populationOptions.populationSize) {
      for (const speciesId of speciesIds) {
        const species = this.species.get(speciesId) as Species<GO, GD, G>
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
        ((this.species.get(b) as Species<GO, GD, G>).bestFitness ?? 0) -
        ((this.species.get(a) as Species<GO, GD, G>).bestFitness ?? 0)
      )
    })

    let elitesDistributed = 0
    while (elitesDistributed < this.populationOptions.globalElites) {
      for (const speciesId of speciesIds) {
        const species = this.species.get(speciesId) as Species<GO, GD, G>
        if (species.elites < species.organisms.length) {
          species.elites++
          elitesDistributed++

          if (elitesDistributed === this.populationOptions.globalElites) {
            break
          }
        }
      }
    }

    let totalOffspringAndElites = 0

    for (const species of this.species.values()) {
      totalOffspringAndElites += Math.floor(species.offsprings) + species.elites
    }

    if (totalOffspringAndElites !== this.populationOptions.populationSize) {
      throw new Error('Wrong number of planned individuals in next population')
    }

    for (const species of this.species.values()) {
      // Kill individuals of low performance, not allowed to reproduce
      species.retainBest()
      // Increase the age of and lock all species, making current organisms old
      species.age()
    }

    for (const i of speciesIds) {
      const species = this.species.get(i) as Species<GO, GD, G>

      // Steal elites from number of offsprings
      const elitesTakenFromOffspring = Math.min(
        this.populationOptions.elitesFromOffspring,
        Math.floor(species.offsprings)
      )
      species.elites += elitesTakenFromOffspring
      species.offsprings -= elitesTakenFromOffspring

      // Directly copy elites, without crossover or mutation
      for (let j = 0; j < species.elites; j++) {
        const organism = species.organisms[
          j % species.organisms.length
        ] as Organism<G>
        this.push(organism.asElite(), true)
      }
    }

    // Evolve species
    for (const i of speciesIds) {
      const species = this.species.get(i) as Species<GO, GD, G>
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
      const species = this.species.get(i) as Species<GO, GD, G>
      if (species.extinct) {
        this.species.delete(i)
        this.extinctSpecies.set(i, species)
      }
    }

    // Verify correct number of individuals in new population
    if (this.size !== this.populationOptions.populationSize) {
      throw new Error(
        `Wrong number of individuals in population; expected ${this.populationOptions.populationSize}, got ${this.size}`
      )
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
    for (const [speciesIndex, organismIndex, genome] of this.genomeEntries()) {
      const phenotype = this.algorithm.createPhenotype(genome)
      phenotypeData.add([speciesIndex, organismIndex, phenotype])
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

  toJSON(): PopulationData<GO, GD, G> {
    const speciesData: Array<PopulationDataSpeciesEntry<GO, GD, G>> = []
    for (const [id, species] of this.species.entries()) {
      speciesData.push([id, toPopulationDataSpecies(species)])
    }
    const extinctSpeciesData: Array<PopulationDataSpeciesEntry<GO, GD, G>> = []
    for (const [id, species] of this.species.entries()) {
      extinctSpeciesData.push([id, toPopulationDataSpecies(species)])
    }
    return {
      algorithmName: this.algorithm.name,

      // shared state
      config: this.configProvider.toJSON(),
      state: this.stateProvider.toJSON(), // created by population
      genomeOptions: this.genomeOptions,

      // shared with species
      populationOptions: this.populationOptions,

      // population state
      species: speciesData,
      extinctSpecies: extinctSpeciesData,
      nextId: this.nextId,
    }
  }

  toFactoryOptions(): PopulationFactoryOptions<GO, GD, G> {
    const speciesData: Array<PopulationDataSpeciesEntry<GO, GD, G>> = []
    for (const [id, species] of this.species.entries()) {
      speciesData.push([id, toPopulationDataSpecies(species)])
    }
    const extinctSpeciesData: Array<PopulationDataSpeciesEntry<GO, GD, G>> = []
    for (const [id, species] of this.species.entries()) {
      extinctSpeciesData.push([id, toPopulationDataSpecies(species)])
    }
    return {
      state: this.stateProvider.toJSON(),
      species: speciesData,
      extinctSpecies: extinctSpeciesData,
      nextId: this.nextId,
    }
  }
}
