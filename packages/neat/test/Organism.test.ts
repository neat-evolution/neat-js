import type { InitConfig } from '@neat-js/core'
import { defaultNEATConfigOptions } from '@neat-js/core'
import { Organism } from '@neat-js/evolution'
import { beforeEach, describe, expect, test } from 'vitest'

import { createConfig } from '../src/createConfig.js'
import { createGenome } from '../src/createGenome.js'
import { createState } from '../src/createState.js'
import { type DefaultNEATGenome } from '../src/DefaultNEATGenome.js'
import { defaultNEATGenomeOptions } from '../src/NEATGenomeOptions.js'

describe('Organism class', () => {
  let state: DefaultNEATGenome['state']
  let initConfig: InitConfig
  let genomeOptions: DefaultNEATGenome['genomeOptions']
  let genome: DefaultNEATGenome
  let generation: number

  let createSeasonedGenome: () => DefaultNEATGenome

  beforeEach(() => {
    state = createState()
    initConfig = {
      inputs: 1,
      outputs: 1,
    }
    genomeOptions = {
      ...defaultNEATGenomeOptions,
      ...initConfig,
    }
    createSeasonedGenome = () => {
      const options = {
        ...defaultNEATConfigOptions,
        addNodeProbability: 1,
        addLinkProbability: 1,
        removeLinkProbability: 0,
        removeNodeProbability: 0,
        mutateLinkWeightProbability: 0,
      }
      const genome = createGenome(createConfig(options), state, genomeOptions)
      for (let i = 0; i < 50; i++) {
        genome.mutate()
      }
      return genome
    }
    genome = createSeasonedGenome()
    generation = 0
  })

  describe('Organism constructor', () => {
    test('should correctly initialize', () => {
      const organism = new Organism(genome, generation)
      expect(organism.fitness).toBeNull()
      expect(organism.adjustedFitness).toBeNull()
      expect(organism.generation).toBe(0)
    })

    test('should correctly initialize with all parameters', () => {
      const organism = new Organism(genome, generation, {
        fitness: 100,
        adjustedFitness: 200,
      })
      expect(organism.genome).toBe(genome)
      expect(organism.generation).toBe(generation)
      expect(organism.fitness).toBe(100)
      expect(organism.adjustedFitness).toBe(200)
    })

    test('should correctly initialize without fitness and adjustedFitness', () => {
      const organism = new Organism(genome, generation)
      expect(organism.genome).toBe(genome)
      expect(organism.generation).toBe(generation)
      expect(organism.fitness).toBeNull()
      expect(organism.adjustedFitness).toBeNull()
    })

    test('should correctly initialize with null fitness and adjustedFitness', () => {
      const organism = new Organism(genome, generation)
      expect(organism.genome).toBe(genome)
      expect(organism.generation).toBe(generation)
      expect(organism.fitness).toBeNull()
      expect(organism.adjustedFitness).toBeNull()
    })

    test('should correctly initialize without generation', () => {
      const organism = new Organism(genome)
      expect(organism.genome).toBe(genome)
      expect(organism.generation).toBe(0)
      expect(organism.fitness).toBeNull()
      expect(organism.adjustedFitness).toBeNull()
    })
  })

  describe('Organism crossover method', () => {
    test('should correctly perform crossover', () => {
      const organism1 = new Organism(genome, generation)
      const organism2 = new Organism(genome, generation)
      const child = organism1.crossover(organism2)
      expect(child.generation).toBe(organism1.generation + 1)
    })

    test('should correctly perform crossover when both organisms have fitness values', () => {
      const organism1 = new Organism(genome, generation, {
        fitness: 100,
        adjustedFitness: null,
      })
      const organism2 = new Organism(genome, generation, {
        fitness: 200,
        adjustedFitness: null,
      })
      const child = organism1.crossover(organism2)
      expect(child.generation).toBe(organism1.generation + 1)
    })

    test('should correctly perform crossover when one organism has a fitness value', () => {
      const organism1 = new Organism(genome, generation, {
        fitness: 100,
        adjustedFitness: null,
      })
      const organism2 = new Organism(genome, generation)
      const child = organism1.crossover(organism2)
      expect(child.generation).toBe(organism1.generation + 1)
    })

    test('should correctly perform crossover when neither organism has a fitness value', () => {
      const organism1 = new Organism(genome, generation)
      const organism2 = new Organism(genome, generation)
      const child = organism1.crossover(organism2)
      expect(child.generation).toBe(organism1.generation + 1)
    })

    test('should produce a different genome', () => {
      const organism1 = new Organism(genome, generation, {
        fitness: 100,
        adjustedFitness: null,
      })
      const organism2 = new Organism(genome, generation, {
        fitness: 200,
        adjustedFitness: null,
      })
      const child = organism1.crossover(organism2)
      expect(child.genome).not.toBe(organism1.genome)
      expect(child.genome).not.toBe(organism2.genome)
    })
  })

  describe('Organism cmp', () => {
    test('should return -1 when fitness of first organism is less', () => {
      const organism1 = new Organism(genome, generation, {
        fitness: 10,
        adjustedFitness: null,
      })
      const organism2 = new Organism(genome, generation, {
        fitness: 20,
        adjustedFitness: null,
      })
      expect(organism1.cmp(organism2)).toBe(-1)
    })

    test('should return 1 when fitness of first organism is greater', () => {
      const organism1 = new Organism(genome, generation, {
        fitness: 20,
        adjustedFitness: null,
      })
      const organism2 = new Organism(genome, generation, {
        fitness: 10,
        adjustedFitness: null,
      })
      expect(organism1.cmp(organism2)).toBe(1)
    })

    test('should return 0 when fitness of both organisms are equal', () => {
      const organism1 = new Organism(genome, generation, {
        fitness: 20,
        adjustedFitness: null,
      })
      const organism2 = new Organism(genome, generation, {
        fitness: 20,
        adjustedFitness: null,
      })
      expect(organism1.cmp(organism2)).toBe(0)
    })

    test('should throw error when fitness of first organism is null', () => {
      const organism1 = new Organism(genome, generation)
      const organism2 = new Organism(genome, generation, {
        fitness: 10,
        adjustedFitness: null,
      })
      expect(() => organism1.cmp(organism2)).toThrowError(
        'Fitness cannot be null or undefined'
      )
    })

    test('should throw error when fitness of second organism is undefined', () => {
      const organism1 = new Organism(genome, generation, {
        fitness: 10,
        adjustedFitness: null,
      })
      const organism2 = new Organism(genome, generation)
      expect(() => organism1.cmp(organism2)).toThrowError(
        'Fitness cannot be null or undefined'
      )
    })

    test('should throw error when fitness of either organism is NaN', () => {
      const organism1 = new Organism(genome, generation, {
        fitness: NaN,
        adjustedFitness: null,
      })
      const organism2 = new Organism(genome, generation, {
        fitness: 10,
        adjustedFitness: null,
      })
      expect(() => organism1.cmp(organism2)).toThrowError(
        'Fitness cannot be NaN'
      )
    })
  })

  describe('Organism mutate', () => {
    test('should change the genome after mutation', () => {
      const organism = new Organism(genome)
      const size = organism.genome.hiddenNodes.size + organism.genome.links.size
      organism.mutate()
      const mutatedSize =
        organism.genome.hiddenNodes.size + organism.genome.links.size
      expect(mutatedSize).not.toEqual(size)
    })

    test('should not change fitness, adjustedFitness, or generation after mutation', () => {
      const organism = new Organism(genome, generation, {
        fitness: 20,
        adjustedFitness: 30,
      })
      const originalFitness = organism.fitness
      const originalAdjustedFitness = organism.adjustedFitness
      const originalGeneration = organism.generation
      organism.mutate()
      expect(organism.fitness).toEqual(originalFitness)
      expect(organism.adjustedFitness).toEqual(originalAdjustedFitness)
      expect(organism.generation).toEqual(originalGeneration)
    })
  })

  test('should correctly calculate distance', () => {
    const organism1 = new Organism(genome, generation)
    const organism2 = new Organism(genome, generation)
    const dist = organism1.distance(organism2)
    expect(dist).toBe(0)
  })

  describe('Organism asElite', () => {
    test('should increment the generation', () => {
      const organism = new Organism(genome, generation)
      const elite = organism.asElite()
      expect(elite.generation).toBe(organism.generation + 1)
    })

    test('should clone the genome', () => {
      const organism = new Organism(genome, generation)
      const elite = organism.asElite()
      expect(elite.genome).not.toBe(organism.genome)
      expect(elite.genome.toJSON()).toEqual(organism.genome.toJSON())
    })

    test('should reset fitness', () => {
      const organism = new Organism(genome, generation, {
        fitness: 42,
        adjustedFitness: null,
      })
      const elite = organism.asElite()
      expect(elite.fitness).toBeNull()
    })

    test('should reset adjusted fitness', () => {
      const organism = new Organism(genome, generation, {
        fitness: null,
        adjustedFitness: 42,
      })
      const elite = organism.asElite()
      expect(elite.adjustedFitness).toBeNull()
    })
  })

  describe('Organism toJSON', () => {
    test('should correctly serialize', () => {
      const organism = new Organism(genome, generation, {
        fitness: 100,
        adjustedFitness: 200,
      })
      const json = organism.toJSON()
      expect(json.genome).toEqual(genome.toJSON())
      expect(json.organismState.fitness).toBe(100)
      expect(json.organismState.adjustedFitness).toBe(200)
      expect(json.organismState.generation).toBe(0)
    })
  })
})
