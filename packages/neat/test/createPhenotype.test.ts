import {
  type NEATState,
  defaultNEATConfigOptions,
  isOrderedActionEdge,
  type NodeRef,
} from '@neat-js/core'
import { isPhenotypeLinkAction } from '@neat-js/phenotype'
import { beforeEach, describe, expect, test } from 'vitest'

import {
  type DefaultNEATGenome,
  createConfig,
  createGenome,
  createPhenotype,
  type NEATGenomeOptions,
  defaultNEATGenomeOptions,
  createState,
  type NEATNode,
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
    genomeOptions = defaultNEATGenomeOptions
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
        genomeOptions,
        stateProvider
      )
      for (let i = 0; i < 50; i++) {
        genome.mutate()
      }
      return genome
    }
  })

  // expect(
  //   orderedActions.some((action) => {
  //     if (isOrderedActionEdge(action) && action[1] == null) {
  //       return true
  //     }
  //     return false
  //   })
  // ).toBe(false)
  function exclusiveToSetA<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    const exclusive = new Set<T>()

    for (const elem of setA) {
      if (!setB.has(elem)) {
        exclusive.add(elem)
      }
    }

    return exclusive
  }

  test('should create a phenotype', () => {
    for (let i = 0; i < 100; i++) {
      const genome = createSeasonedGenome()
      const phenotype = createPhenotype(genome)
      const badAction = phenotype.actions.find((a) =>
        isPhenotypeLinkAction(a) && a.to == null ? a : undefined
      )
      if (badAction != null) {
        // 1. gather up every node from genome.inputs, genome.outputs, and genome.hiddenNodes
        // 2. gather up every node from genome.links to and from
        // 3. gather up every node from genome.connections.getAllNodes()
        // 3. gather up every node from genome.connections.getAllConnections()
        const genomeNodes = new Set([
          ...genome.inputs.values(),
          ...genome.outputs.values(),
          ...genome.hiddenNodes.values(),
        ])

        const genomeLinkNodes = new Set(
          Array.from(genome.links.values())
            .map(({ from, to }) => [from, to])
            .flat()
        )
        const connectionNodes = new Set(genome.connections.getAllNodes())
        const connectionLinkNodes = new Set(
          Array.from(genome.connections.getAllConnections())
            .map(([from, to]) => [from, to])
            .flat()
        )
        expect(Array.from(exclusiveToSetA(genomeLinkNodes, genomeNodes))).toBe(
          false
        )
        expect(genome.hiddenNodes.size).toBe(
          genomeLinkNodes.size - genome.inputs.size - genome.outputs.size
        )
        expect(genomeNodes.size).toBe(genomeLinkNodes.size)
        // expect(genomeNodes.size).toBe(2)
        expect(connectionNodes.size).toBe(connectionLinkNodes.size)
        expect(connectionNodes.size).toBe(genomeLinkNodes.size)
        expect(connectionNodes.size).toBe(2)
        expect(Array.from(genome.links.values()).map(({ to }) => to)).toBe(6)
      }
      expect(badAction).toBeUndefined()
    }

    const genome = createSeasonedGenome()
    const phenotype = createPhenotype(genome)
    expect(
      phenotype.actions.some((action) => {
        if (isPhenotypeLinkAction(action) && action.to == null) {
          return true
        }
        return false
      })
    ).toBe(false)
    expect(phenotype.actions.map((a) => JSON.stringify(a))).toBe(true)
  })
})
