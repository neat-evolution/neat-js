import {
  defaultNEATConfigOptions,
  isPhenotypeLinkAction,
  phenotypeDataFromSharedBuffer,
  phenotypeDataToSharedBuffer,
} from '@neat-js/core'
import { beforeEach, describe, expect, test } from 'vitest'

import {
  type DefaultNEATGenome,
  createConfig,
  createGenome,
  createPhenotype,
  type NEATGenomeOptions,
  defaultNEATGenomeOptions,
  createState,
  type NEATState,
} from '../src/index.js'

describe('createPhenotype', () => {
  let stateProvider: NEATState
  let genomeOptions: NEATGenomeOptions

  /**
   * Creates a genome that has been mutated 50 times
   * @returns {DefaultNEATGenome} seasoned genome
   */
  let createSeasonedGenome: () => DefaultNEATGenome

  beforeEach(async () => {
    genomeOptions = {
      ...defaultNEATGenomeOptions,
      inputs: 4,
      outputs: 3,
    }
    stateProvider = createState()

    createSeasonedGenome = () => {
      const configOptions = {
        ...defaultNEATConfigOptions,
        // always mutates
        addNodeProbability: 1,
        addLinkProbability: 1,
        removeLinkProbability: 0,
        removeNodeProbability: 0,
        mutateLinkWeightProbability: 0,
      }
      const genome = createGenome(
        createConfig(configOptions),
        stateProvider,
        genomeOptions
      )
      for (let i = 0; i < 50; i++) {
        genome.mutate()
      }
      return genome
    }
  })

  test('should create a valid phenotype', () => {
    const genome = createSeasonedGenome()
    const phenotype = createPhenotype(genome)
    expect(
      phenotype.actions.some((action) => {
        if (
          isPhenotypeLinkAction(action) &&
          (action.from == null || action.to == null)
        ) {
          return true
        }
        return false
      })
    ).toBe(false)
    expect(phenotype.length).toBeGreaterThan(0)
    expect(phenotype.inputs.length).toBe(4)
    expect(phenotype.outputs.length).toBe(3)
    expect(phenotype.actions.length).toBeGreaterThan(0)
  })
  test('should serialize and deserialize', () => {
    const genome = createSeasonedGenome()
    const phenotype = createPhenotype(genome)
    const serializedPhenotype = phenotypeDataToSharedBuffer([0, 0, phenotype])
    expect(serializedPhenotype).toBeInstanceOf(SharedArrayBuffer)
    const hydratedPhenotype = phenotypeDataFromSharedBuffer(serializedPhenotype)
    expect(hydratedPhenotype).toEqual([0, 0, phenotype])
  })
})
