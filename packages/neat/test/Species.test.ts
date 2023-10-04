import { defaultNEATConfigOptions } from '@neat-js/core'
import {
  defaultSpeciesOptions,
  type SpeciesOptions,
  Species,
} from '@neat-js/evolution'
import { Organism } from '@neat-js/evolution'
import { beforeEach, describe, expect, test } from 'vitest'

import { createConfig } from '../src/createConfig.js'
import { createGenome } from '../src/createGenome.js'
import { createState } from '../src/createState.js'
import type {
  DefaultNEATGenome,
  DefaultNEATGenomeData,
} from '../src/DefaultNEATGenome.js'
import type { NEATConfig } from '../src/NEATConfig.js'
import {
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
} from '../src/NEATGenomeOptions.js'
import type { NEATState } from '../src/NEATState.js'

describe('Species class', () => {
  let configProvider: NEATConfig
  let options: NEATGenomeOptions
  let stateProvider: NEATState
  let createSeasonedGenome: () => Promise<DefaultNEATGenome>

  beforeEach(() => {
    configProvider = createConfig(defaultNEATConfigOptions)
    options = defaultNEATGenomeOptions
    stateProvider = createState()
    createSeasonedGenome = async () => {
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
        stateProvider,
        options
      )
      for (let i = 0; i < 50; i++) {
        await genome.mutate()
      }
      return genome
    }
  })

  describe('Species constructor', () => {
    test('should correctly initialize', () => {
      const options: SpeciesOptions = defaultSpeciesOptions
      const species = new Species<
        NEATGenomeOptions,
        DefaultNEATGenomeData,
        DefaultNEATGenome
      >(options)
      expect(species.organisms.length).toBe(0)
    })
  })

  describe('Species push', () => {
    test('should add organism to species', async () => {
      const species = new Species<
        NEATGenomeOptions,
        DefaultNEATGenomeData,
        DefaultNEATGenome
      >(defaultSpeciesOptions)
      const genome = await createSeasonedGenome()
      const organism = new Organism(genome)
      species.push(organism)
      expect(species.organisms.length).toBe(1)
    })
  })

  describe('Species isCompatible', () => {
    test('should return true if they are not compatible', async () => {
      const options: SpeciesOptions = {
        ...defaultSpeciesOptions,
        speciationThreshold: 1,
      }
      const species = new Species<
        NEATGenomeOptions,
        DefaultNEATGenomeData,
        DefaultNEATGenome
      >(options)
      const genome1 = await createSeasonedGenome()
      const genome2 = await createSeasonedGenome()
      const organism1 = new Organism(genome1)
      const organism2 = new Organism(genome2)
      species.push(organism1)
      const result = species.isCompatible(organism2)
      expect(result).toBe(true)
    })

    test('should return false if they are not compatible', async () => {
      const options: SpeciesOptions = {
        ...defaultSpeciesOptions,
        speciationThreshold: 0,
      }
      const species = new Species<
        NEATGenomeOptions,
        DefaultNEATGenomeData,
        DefaultNEATGenome
      >(options)
      const genome1 = await createSeasonedGenome()
      const genome2 = await createSeasonedGenome()
      const organism1 = new Organism(genome1)
      const organism2 = new Organism(genome2)
      species.push(organism1)
      const result = species.isCompatible(organism2)
      expect(result).toBe(false)
    })
  })
})
