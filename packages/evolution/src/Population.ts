import {
  type Genome,
  type GenomeFactoryOptions,
  type GenomeOptions,
  type GenomeData,
  type ConfigProvider,
  type NodeExtension,
  type LinkExtension,
  type StateProvider,
} from '@neat-js/core'
import type { Evaluator } from '@neat-js/evaluator'
import type { PhenotypeData } from '@neat-js/phenotype'
import { threadRNG } from '@neat-js/utils'

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
    this.genomeOptions = {
      ...genomeOptions,
      // InitConfig
      ...this.evaluator.environment.description,
    } as unknown as GO

    if (populationFactoryOptions != null) {
      const hydrateOrganism = (
        genomeFactoryOptions: GFO,
        organismFactoryOptions: OrganismState
      ) => {
        const genome = algorithm.createGenome(
          configProvider,
          this.stateProvider,
          this.genomeOptions,
          genomeFactoryOptions
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
            hydrateOrganism(genomeFactoryOptions as GFO, organismFactoryOptions)
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
    } else {
      for (let i = 0; i < this.populationOptions.populationSize; i++) {
        const genome = algorithm.createGenome(
          configProvider,
          this.stateProvider,
          this.genomeOptions
        )
        this.push(new Organism<G>(genome), false)
      }
    }
  }

  /// Add organism to population
  push(organism: Organism<G>, lockNew: boolean): void {
    let species = this.compatibleSpecies(organism)
    if (species != null) {
      species.push(organism)
    } else {
      // New organism is not compatible with any existing species, create a new one
      species = new Species<GO, GD, G>(this.populationOptions)
      // If during reproduction, the species is locked so that the new organism avoids parent selection
      if (lockNew) {
        species.lock()
      }
      species.push(organism)
      this.species.set(this.nextId, species)
      this.nextId += 1
    }
  }

  /// Find first species compatible with organism
  compatibleSpecies(organism: Organism<G>): Species<GO, GD, G> | null {
    for (const species of this.species.values()) {
      if (species.isCompatible(organism)) {
        return species
      }
    }
    return null
  }

  /// Evolve the population
  evolve(): void {
    // Adjust fitnesses based on age, stagnation and apply fitness sharing
    // Also sorts organisms by descending fitness
    for (const species of this.species.values()) {
      species.adjustFitness()
    }

    // Average fitness of all organisms
    const elites =
      this.populationOptions.globalElites +
      this.populationOptions.guaranteedElites * this.species.size

    // Subtract number of guaranteed elites from pop size, reserving these slots for elites.
    let sumAdjustedFitness = 0
    for (const { adjustedFitness } of this.organismValues()) {
      if (adjustedFitness == null) {
        throw new Error('Adjusted fitness is null')
      }
      sumAdjustedFitness += adjustedFitness
    }
    const avgFitness =
      sumAdjustedFitness / (this.populationOptions.populationSize - elites)

    // Calculate number of new offsprings to produce within each new species
    for (const species of this.species.values()) {
      species.calculateOffsprings(avgFitness)
    }

    // The total size of the next population before making up for floating point precision
    let sumOffsprings = 0
    for (const species of this.species.values()) {
      sumOffsprings += Math.floor(species.offsprings)
    }
    let newPopulationSize = sumOffsprings + elites

    const speciesIds = Array.from(this.species.keys())

    // Sort species based on closeness to additional offspring (lowest first)
    speciesIds.sort((a, b) => {
      const speciesA = this.species.get(a) as Species<GO, GD, G>
      const speciesB = this.species.get(b) as Species<GO, GD, G>
      const aValue = 1.0 - (speciesA.offsprings % 1.0)
      const bValue = 1.0 - (speciesB.offsprings % 1.0)
      const compare = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      // FIXME: sorting by ascending or descending doesn't seem to matter
      return compare
    })

    // Distribute missing offsprings amongst species
    // in order of floating distance from additional offspring
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
      const speciesA = this.species.get(a) as Species<GO, GD, G>
      const speciesB = this.species.get(b) as Species<GO, GD, G>
      const aValue = speciesA.bestFitness ?? -Infinity
      const bValue = speciesB.bestFitness ?? -Infinity
      const compare = aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      // FIXME: sorting by ascending or descending doesn't seem to matter
      return compare
    })
    let elitesDistributed = 0

    // Distribute elites
    while (elitesDistributed < this.populationOptions.globalElites) {
      for (const speciesId of speciesIds) {
        const species = this.species.get(speciesId) as Species<GO, GD, G>
        if (species.elites < species.size) {
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

    // Kill individuals of low performance, not allowed to reproduce
    for (const species of this.species.values()) {
      species.retainBest()
    }

    // Increase the age of and lock all species, making current organisms old
    for (const species of this.species.values()) {
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
        const organism = species.organisms[j % species.size] as Organism<G>
        this.push(organism.asElite(), true)
      }
    }

    // Evolve species
    const rng = threadRNG()
    for (const i of speciesIds) {
      const species = this.species.get(i) as Species<GO, GD, G>
      const reproductions = Math.floor(species.offsprings)

      // Breed new organisms
      for (let _ = 0; _ < reproductions; _++) {
        const father =
          rng.gen() < this.populationOptions.interspeciesReproductionProbability
            ? // Interspecies breeding
              this.tournamentSelect(
                this.populationOptions.interspeciesTournamentSize
              )
            : // Breeding within species
              species.tournamentSelect(this.populationOptions.tournamentSize)

        if (father == null) {
          throw new Error('Unable to gather father organism')
        }

        let child: Organism<G>
        if (rng.gen() < this.populationOptions.asexualReproductionProbability) {
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

  /// Get random organism from population
  randomOrganism(): Organism<G> | null {
    const len = this.size

    if (len === 0) {
      return null
    } else {
      const randomIndex = threadRNG().genRange(0, len)
      let i = 0
      for (const organism of this.organismValues()) {
        if (i === randomIndex) {
          return organism
        }
        i++
      }
    }
    return null
  }

  /// Use tournament selection to select an organism
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

  /// Update fitness of all organisms
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

  /// Number of organisms. Adheres to lock.
  public get size(): number {
    let size = 0
    for (const species of this.species.values()) {
      size += species.size
    }
    return size
  }

  /// Iterate organisms. Adheres to lock.
  *organismValues(): IterableIterator<Organism<G>> {
    for (const species of this.species.values()) {
      yield* species.organismValues()
    }
  }

  /// Enumerate genomes. Adheres to lock.
  *genomeEntries(): IterableIterator<
    [speciesIndex: number, organismIndex: number, genome: G]
  > {
    for (const [speciesIndex, species] of this.species.entries()) {
      for (const [organismIndex, { genome }] of species.organismEntries()) {
        yield [speciesIndex, organismIndex, genome]
      }
    }
  }

  best(): Organism<G> | null {
    let best = null
    for (const organism of this.organismValues()) {
      if (best == null) {
        best = organism
      } else if ((organism.fitness as number) > (best.fitness as number)) {
        best = organism
      }
    }
    return best
  }

  toJSON(): PopulationData<GO, GD, G> {
    const speciesData: Array<PopulationDataSpeciesEntry<GO, GD, G>> = []
    for (const [id, species] of this.species.entries()) {
      speciesData.push([id, toPopulationDataSpecies(species)])
    }
    const extinctSpeciesData: Array<PopulationDataSpeciesEntry<GO, GD, G>> = []
    for (const [id, species] of this.extinctSpecies.entries()) {
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
