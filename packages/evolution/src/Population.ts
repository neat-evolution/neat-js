import type {
  Algorithm,
  AlgorithmContext,
  ConfigDataOf,
  ConfigTypeOf,
  GenomeFactoryOptionsOf,
  GenomeOptionsOf,
  InitConfig,
  LinkDataOf,
  NodeHiddenDataOf,
  StateDataOf,
  StateTypeOf,
} from '@neat-evolution/core'
import type { Evaluator, GenomeEntry } from '@neat-evolution/evaluator'
import type { RNG } from '@neat-evolution/utils'
import QuickLRU from 'quick-lru'

import { Organism } from './Organism.js'
import type { OrganismFactoryOptions } from './OrganismFactoryOptions.js'
import type { PopulationData } from './PopulationData.js'
import {
  type PopulationDataSpecies,
  type PopulationDataSpeciesEntry,
  type PopulationFactoryOptions,
  toPopulationDataSpecies,
} from './PopulationFactoryOptions.js'
import type { PopulationOptions } from './PopulationOptions.js'
import type { Reproducer } from './reproducer/Reproducer.js'
import type { ReproducerFactory } from './reproducer/ReproducerFactory.js'
import { Species } from './Species.js'
import type { SpeciesFactoryOptions } from './SpeciesFactoryOptions.js'

export class Population<Ctx extends AlgorithmContext = AlgorithmContext> {
  public readonly evaluator: Evaluator
  public readonly reproducer: Reproducer
  public readonly algorithm: Algorithm<Ctx>
  public readonly configProvider: ConfigTypeOf<Ctx>
  public readonly stateProvider: StateTypeOf<Ctx>

  public readonly species: Map<number, Species<Ctx>>

  public readonly extinctSpecies: Map<number, Species<Ctx>>

  private nextId: number

  public readonly populationOptions: PopulationOptions
  public readonly genomeOptions: GenomeOptionsOf<Ctx>
  public readonly initConfig: InitConfig
  public readonly evaluatorReady: Promise<void>

  constructor(
    createReproducer: ReproducerFactory<Population<Ctx>>,
    evaluator: Evaluator,
    algorithm: Algorithm<Ctx>,
    configProvider: ConfigTypeOf<Ctx>,
    populationOptions: PopulationOptions,
    genomeOptions: GenomeOptionsOf<Ctx>,
    initConfig: InitConfig,
    populationFactoryOptions?: PopulationFactoryOptions<
      ConfigDataOf<Ctx>,
      StateDataOf<Ctx>,
      NodeHiddenDataOf<Ctx>,
      LinkDataOf<Ctx>,
      GenomeFactoryOptionsOf<Ctx>,
      GenomeOptionsOf<Ctx>
    >
  ) {
    this.evaluator = evaluator
    this.algorithm = algorithm
    this.configProvider = configProvider
    this.stateProvider = algorithm.createState(populationFactoryOptions?.state)

    this.species = new Map<number, Species<Ctx>>()

    this.extinctSpecies = new QuickLRU<number, Species<Ctx>>({
      maxSize: 1000,
    }) as unknown as Map<number, Species<Ctx>>
    this.nextId = populationFactoryOptions?.nextId ?? 0

    this.populationOptions = populationOptions
    this.genomeOptions = genomeOptions
    this.initConfig = initConfig

    if (populationFactoryOptions != null) {
      const hydrateOrganism = (
        genomeFactoryOptions: GenomeFactoryOptionsOf<Ctx>,
        organismFactoryOptions: OrganismFactoryOptions
      ): Organism<Ctx> => {
        const genome = algorithm.createGenome(
          configProvider,
          this.stateProvider,
          this.genomeOptions,
          initConfig,
          genomeFactoryOptions
        )
        const organism = new Organism<Ctx>(
          genome,
          organismFactoryOptions.generation,
          organismFactoryOptions
        )
        return organism
      }
      const hydrateSpecies = (
        speciesMap: Map<number, Species<Ctx>>,
        id: number,
        speciesData: PopulationDataSpecies<
          ConfigDataOf<Ctx>,
          StateDataOf<Ctx>,
          NodeHiddenDataOf<Ctx>,
          LinkDataOf<Ctx>,
          GenomeFactoryOptionsOf<Ctx>,
          GenomeOptionsOf<Ctx>
        >
      ) => {
        const organisms: Array<Organism<Ctx>> = []
        for (const {
          genome: genomeFactoryOptions,
          organismState: organismFactoryOptions,
        } of speciesData.organisms) {
          organisms.push(
            hydrateOrganism(genomeFactoryOptions, organismFactoryOptions)
          )
        }
        const speciesFactoryOptions: SpeciesFactoryOptions<Ctx> = {
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
          this.genomeOptions,
          this.initConfig
        )
        this.push(new Organism<Ctx>(genome), false)
      }
    }

    // Must be last
    this.reproducer = createReproducer(this)
    this.evaluatorReady = this.evaluator.initGenomeFactory(
      this.configProvider.toJSON(),
      this.genomeOptions,
      this.initConfig
    )
  }

  /// Add organism to population
  push(organism: Organism<Ctx>, lockNew: boolean): void {
    let species = this.compatibleSpecies(organism)
    if (species != null) {
      species.push(organism)
    } else {
      // New organism is not compatible with any existing species, create a new one
      species = new Species<Ctx>(this.populationOptions)
      // During reproduction the species is locked so that the new organism avoids parent selection
      if (lockNew) {
        species.lock()
      }
      species.push(organism)
      this.species.set(this.nextId, species)
      this.nextId += 1
    }
  }

  /// Find first species compatible with organism
  compatibleSpecies(organism: Organism<Ctx>): Species<Ctx> | null {
    for (const species of this.species.values()) {
      if (species.isCompatible(organism)) {
        return species
      }
    }
    return null
  }

  /// Evolve the population
  async evolve(rng: RNG): Promise<void> {
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
      const speciesA = this.species.get(a) as Species<Ctx>
      const speciesB = this.species.get(b) as Species<Ctx>
      const aValue = 1.0 - (speciesA.offsprings % 1.0)
      const bValue = 1.0 - (speciesB.offsprings % 1.0)
      const compare = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      return compare
    })

    // Distribute missing offsprings amongst species
    // in order of floating distance from additional offspring
    while (newPopulationSize < this.populationOptions.populationSize) {
      for (const speciesId of speciesIds) {
        const species = this.species.get(speciesId) as Species<Ctx>
        species.offsprings = Math.floor(species.offsprings) + 1
        newPopulationSize++

        if (newPopulationSize === this.populationOptions.populationSize) {
          break
        }
      }
    }

    // Sort species based on bestFitness (best first)
    speciesIds.sort((a, b) => {
      const speciesA = this.species.get(a) as Species<Ctx>
      const speciesB = this.species.get(b) as Species<Ctx>
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
        const species = this.species.get(speciesId) as Species<Ctx>
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

    // Perform copyElites and reproduce simultaneously.
    // Both methods return organisms without pushing to the population.
    const [newElites, newOffspring] = await Promise.all([
      this.reproducer.copyElites(speciesIds),
      this.reproducer.reproduce(speciesIds, rng),
    ])

    // Push in deterministic order: all elites first, then all offspring.
    // This ensures species assignment is independent of worker completion timing.
    for (const organism of newElites) {
      this.push(organism as unknown as Organism<Ctx>, true)
    }
    for (const organism of newOffspring) {
      this.push(organism as unknown as Organism<Ctx>, true)
    }

    // Kill old population
    for (const species of this.species.values()) {
      species.removeOld()
    }

    // Remove extinct species
    for (const i of speciesIds) {
      const species = this.species.get(i) as Species<Ctx>
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

  async mutate(rng: RNG) {
    const promises: Array<Promise<void>> = []
    let i = 0
    for (const organism of this.organismValues()) {
      promises.push(organism.mutate(rng.derive(`organism:${i}`)))
      i++
    }
    await Promise.all(promises)
  }

  /// Get random organism from population
  randomOrganism(rng: RNG): Organism<Ctx> | null {
    const len = this.size

    if (len === 0) {
      return null
    } else {
      const randomIndex = rng.genIntRange(0, len)
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
  tournamentSelect(k: number, rng: RNG): Organism<Ctx> | null {
    let best: Organism<Ctx> | null = null
    let bestFitness: number | null = null

    for (let i = 0; i < k; i++) {
      const organism = this.randomOrganism(rng)
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
  async evaluate(rng: RNG) {
    await this.evaluatorReady

    // evaluate every organism's genome
    for await (const result of this.evaluator.evaluate(
      this.genomeEntries(),
      rng
    )) {
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
  *organismValues(): IterableIterator<Organism<Ctx>> {
    for (const species of this.species.values()) {
      yield* species.organismValues()
    }
  }

  /// Enumerate genomes. Adheres to lock.
  *genomeEntries(): IterableIterator<GenomeEntry> {
    for (const [speciesIndex, species] of this.species.entries()) {
      for (const [organismIndex, { genome }] of species.organismEntries()) {
        yield [speciesIndex, organismIndex, genome] as GenomeEntry
      }
    }
  }

  best(): Organism<Ctx> | null {
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

  toJSON(): PopulationData<
    ConfigDataOf<Ctx>,
    StateDataOf<Ctx>,
    NodeHiddenDataOf<Ctx>,
    LinkDataOf<Ctx>,
    GenomeFactoryOptionsOf<Ctx>,
    GenomeOptionsOf<Ctx>
  > {
    return {
      algorithmName: this.algorithm.name,
      config: this.configProvider.toJSON(),
      genomeOptions: this.genomeOptions,
      populationOptions: this.populationOptions,
      factoryOptions: this.toFactoryOptions(),
    }
  }

  toFactoryOptions(): PopulationFactoryOptions<
    ConfigDataOf<Ctx>,
    StateDataOf<Ctx>,
    NodeHiddenDataOf<Ctx>,
    LinkDataOf<Ctx>,
    GenomeFactoryOptionsOf<Ctx>,
    GenomeOptionsOf<Ctx>
  > {
    const speciesData: Array<
      PopulationDataSpeciesEntry<
        ConfigDataOf<Ctx>,
        StateDataOf<Ctx>,
        NodeHiddenDataOf<Ctx>,
        LinkDataOf<Ctx>,
        GenomeFactoryOptionsOf<Ctx>,
        GenomeOptionsOf<Ctx>
      >
    > = []
    for (const [id, species] of this.species.entries()) {
      speciesData.push([id, toPopulationDataSpecies(species)])
    }
    const extinctSpeciesData: Array<
      PopulationDataSpeciesEntry<
        ConfigDataOf<Ctx>,
        StateDataOf<Ctx>,
        NodeHiddenDataOf<Ctx>,
        LinkDataOf<Ctx>,
        GenomeFactoryOptionsOf<Ctx>,
        GenomeOptionsOf<Ctx>
      >
    > = []
    for (const [id, species] of this.extinctSpecies.entries()) {
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
