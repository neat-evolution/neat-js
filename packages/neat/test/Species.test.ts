import { defaultNEATConfigOptions, type StateData } from '@neat-evolution/core'
import {
  defaultSpeciesOptions,
  type SpeciesOptions,
  Species,
} from '@neat-evolution/evolution'
import { Organism } from '@neat-evolution/evolution'
import { beforeEach, describe, expect, test } from 'vitest'

import { createConfig } from '../src/createConfig.js'
import { createGenome } from '../src/createGenome.js'
import { createState } from '../src/createState.js'
import type { NEATGenome } from '../src/NEATGenome.js'
import type {
  NEATGenomeFactoryOptions,
  NEATHiddenNodeData,
  NEATLinkData,
} from '../src/NEATGenomeFactoryOptions.js'
import {
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
} from '../src/NEATGenomeOptions.js'
import type { NEATState } from '../src/NEATState.js'

describe('Species class', () => {
  let options: NEATGenomeOptions
  let stateProvider: NEATState
  let createSeasonedGenome: () => Promise<NEATGenome>

  beforeEach(() => {
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
        createConfig({ neat: configOptions }),
        stateProvider,
        options,
        {
          inputs: 1,
          outputs: 1,
        }
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
        null,
        null,
        StateData,
        NEATHiddenNodeData,
        NEATLinkData,
        NEATGenomeFactoryOptions,
        NEATGenomeOptions,
        NEATGenome
      >(options)
      expect(species.organisms.length).toBe(0)
    })
  })

  describe('Species push', () => {
    test('should add organism to species', async () => {
      const species = new Species<
        null,
        null,
        StateData,
        NEATHiddenNodeData,
        NEATLinkData,
        NEATGenomeFactoryOptions,
        NEATGenomeOptions,
        NEATGenome
      >(defaultSpeciesOptions)
      const genome = await createSeasonedGenome()
      const organism = new Organism<
        null,
        null,
        StateData,
        NEATHiddenNodeData,
        NEATLinkData,
        NEATGenomeFactoryOptions,
        NEATGenomeOptions,
        NEATGenome
      >(genome)
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
        null,
        null,
        StateData,
        NEATHiddenNodeData,
        NEATLinkData,
        NEATGenomeFactoryOptions,
        NEATGenomeOptions,
        NEATGenome
      >(options)
      const genome1 = await createSeasonedGenome()
      const genome2 = await createSeasonedGenome()
      const organism1 = new Organism<
        null,
        null,
        StateData,
        NEATHiddenNodeData,
        NEATLinkData,
        NEATGenomeFactoryOptions,
        NEATGenomeOptions,
        NEATGenome
      >(genome1)
      const organism2 = new Organism<
        null,
        null,
        StateData,
        NEATHiddenNodeData,
        NEATLinkData,
        NEATGenomeFactoryOptions,
        NEATGenomeOptions,
        NEATGenome
      >(genome2)
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
        null,
        null,
        StateData,
        NEATHiddenNodeData,
        NEATLinkData,
        NEATGenomeFactoryOptions,
        NEATGenomeOptions,
        NEATGenome
      >(options)
      const genome1 = await createSeasonedGenome()
      const genome2 = await createSeasonedGenome()
      const organism1 = new Organism<
        null,
        null,
        StateData,
        NEATHiddenNodeData,
        NEATLinkData,
        NEATGenomeFactoryOptions,
        NEATGenomeOptions,
        NEATGenome
      >(genome1)
      const organism2 = new Organism<
        null,
        null,
        StateData,
        NEATHiddenNodeData,
        NEATLinkData,
        NEATGenomeFactoryOptions,
        NEATGenomeOptions,
        NEATGenome
      >(genome2)
      species.push(organism1)
      const result = species.isCompatible(organism2)
      expect(result).toBe(false)
    })
  })
})
