import { defaultNEATConfigOptions } from '@neat-js/core'
import type { NEATConfig, NEATState } from '@neat-js/core'
import {
  defaultSpeciesOptions,
  type SpeciesOptions,
  Species,
  type GenomeDataParser,
} from '@neat-js/evolution'
import { Organism } from '@neat-js/evolution'
import { beforeEach, describe, expect, test } from 'vitest'

import { createConfig } from '../src/createConfig.js'
import { createGenome } from '../src/createGenome.js'
import { createState } from '../src/createState.js'
import type {
  DefaultNEATGenome,
  DefaultNEATGenomeData,
  DefaultNEATGenomeFactoryOptions,
} from '../src/DefaultNEATGenome.js'
import {
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
} from '../src/NEATGenomeOptions.js'

describe('Species class', () => {
  let configProvider: NEATConfig
  let options: NEATGenomeOptions
  let stateProvider: NEATState
  let parseGenomeData: GenomeDataParser<
    NEATGenomeOptions,
    DefaultNEATGenomeFactoryOptions,
    DefaultNEATGenome,
    DefaultNEATGenomeData
  >
  let createSeasonedGenome: () => DefaultNEATGenome

  beforeEach(() => {
    configProvider = createConfig(defaultNEATConfigOptions)
    options = defaultNEATGenomeOptions
    stateProvider = createState()
    parseGenomeData = (data) => {
      return createGenome(configProvider, options, stateProvider, data)
    }
    createSeasonedGenome = () => {
      const configOptions = {
        ...defaultNEATConfigOptions,
        addNodeProbability: 1,
        addLinkProbability: 1,
        removeLinkProbability: 0,
        removeNodeProbability: 0,
        mutateLinkWeightProbability: 0,
      }
      const genome = createGenome(
        createConfig(configOptions),
        options,
        stateProvider
      )
      for (let i = 0; i < 50; i++) {
        genome.mutate()
      }
      return genome
    }
  })

  describe('Species constructor', () => {
    test('should correctly initialize', () => {
      const options: SpeciesOptions = defaultSpeciesOptions
      const species = new Species<
        DefaultNEATGenomeFactoryOptions,
        DefaultNEATGenome,
        DefaultNEATGenomeData
      >(options, parseGenomeData)
      expect(species.organisms.length).toBe(0)
    })
  })

  describe('Species push', () => {
    test('should add organism to species', () => {
      const species = new Species<
        DefaultNEATGenomeFactoryOptions,
        DefaultNEATGenome,
        DefaultNEATGenomeData
      >(defaultSpeciesOptions, parseGenomeData)
      const genome = createSeasonedGenome()
      const organism = new Organism(genome)
      species.push(organism)
      expect(species.organisms.length).toBe(1)
    })
  })

  describe('Species isCompatible', () => {
    test('should return true if they are not compatible', () => {
      const options: SpeciesOptions = {
        ...defaultSpeciesOptions,
        speciationThreshold: 1,
      }
      const species = new Species<
        DefaultNEATGenomeFactoryOptions,
        DefaultNEATGenome,
        DefaultNEATGenomeData
      >(options, parseGenomeData)
      const genome1 = createSeasonedGenome()
      const genome2 = createSeasonedGenome()
      const organism1 = new Organism(genome1)
      const organism2 = new Organism(genome2)
      species.push(organism1)
      const result = species.isCompatible(organism2)
      expect(result).toBe(true)
    })

    test('should return false if they are not compatible', () => {
      const options: SpeciesOptions = {
        ...defaultSpeciesOptions,
        speciationThreshold: 0,
      }
      const species = new Species<
        DefaultNEATGenomeFactoryOptions,
        DefaultNEATGenome,
        DefaultNEATGenomeData
      >(options, parseGenomeData)
      const genome1 = createSeasonedGenome()
      const genome2 = createSeasonedGenome()
      const organism1 = new Organism(genome1)
      const organism2 = new Organism(genome2)
      species.push(organism1)
      const result = species.isCompatible(organism2)
      expect(result).toBe(false)
    })
  })

  describe('Species tournamentSelect', () => {
    test('should foo', () => {
      const options: SpeciesOptions = {
        ...defaultSpeciesOptions,
        speciationThreshold: 1,
      }
      const species = new Species<
        DefaultNEATGenomeFactoryOptions,
        DefaultNEATGenome,
        DefaultNEATGenomeData
      >(options, parseGenomeData)

      // create 10 organisms
      for (let i = 0; i < 10; i++) {
        const genome1 = createSeasonedGenome()
        const organism1 = new Organism(genome1)
        species.push(organism1)
      }
      species.adjustFitness()

      const result = species.tournamentSelect(3)
      expect(result).not.toBeNull()
    })
  })
})
