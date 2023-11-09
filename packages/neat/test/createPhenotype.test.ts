import {
  defaultNEATConfigOptions,
  isPhenotypeLinkAction,
  type InitConfig,
} from '@neat-evolution/core'
import { beforeEach, describe, expect, test } from 'vitest'

import {
  type NEATGenome,
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
  const initConfig: InitConfig = {
    inputs: 4,
    outputs: 3,
  }

  /**
   * Creates a genome that has been mutated 50 times
   * @returns {NEATGenome} seasoned genome
   */
  let createSeasonedGenome: () => Promise<NEATGenome>

  beforeEach(async () => {
    genomeOptions = {
      ...defaultNEATGenomeOptions,
    }
    stateProvider = createState()

    createSeasonedGenome = async () => {
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
        createConfig({ neat: configOptions }),
        stateProvider,
        genomeOptions,
        initConfig
      )
      for (let i = 0; i < 50; i++) {
        await genome.mutate()
      }
      return genome
    }
  })

  test('should create a valid phenotype', async () => {
    const genome = await createSeasonedGenome()
    const phenotype = createPhenotype(genome)
    expect(
      phenotype.actions.some((action) => {
        if (
          isPhenotypeLinkAction(action) &&
          (action[1] == null || action[1] == null)
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
})
