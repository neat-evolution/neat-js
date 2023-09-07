import {
  defaultNEATConfigOptions,
  NodeType,
  type InitConfig,
  type GenomeData,
  type GenomeDataNodeEntry,
  type GenomeDataLinkEntry,
  nodeRefToKey,
  nodeRefsToLinkKey,
  type NodeFactoryOptions,
} from '@neat-js/core'
import { beforeEach, describe, expect, test } from 'vitest'

import { createConfig } from '../src/createConfig.js'
import { createGenome } from '../src/createGenome.js'
import { createState } from '../src/createState.js'
import {
  type DefaultNEATGenome,
  type DefaultNEATGenomeData,
} from '../src/DefaultNEATGenome.js'
import type { NEATConfig } from '../src/NEATConfig.js'
import {
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
} from '../src/NEATGenomeOptions.js'
import type { NEATLink } from '../src/NEATLink.js'
import type { NEATNode } from '../src/NEATNode.js'
import type { NEATState } from '../src/NEATState.js'

describe('DefaultNEATGenome class', () => {
  let configProvider: NEATConfig
  let initConfig: InitConfig
  let genomeOptions: NEATGenomeOptions
  let state: NEATState
  let defaultData: GenomeData<NEATGenomeOptions, DefaultNEATGenome>

  let createSeasonedGenome: () => DefaultNEATGenome

  beforeEach(() => {
    configProvider = createConfig(defaultNEATConfigOptions)
    state = createState()
    initConfig = {
      inputs: 1,
      outputs: 1,
    }
    genomeOptions = {
      ...defaultNEATGenomeOptions,
      ...initConfig,
    }
    defaultData = {
      config: configProvider.toJSON(),
      state: state.toJSON(),
      genomeOptions,
      hiddenNodes: [],
      links: [],
      isSafe: true,
    }
    createSeasonedGenome = () => {
      const options = {
        ...configProvider.config,
        addNodeProbability: 1,
        addLinkProbability: 1,
        removeLinkProbability: 0,
        removeNodeProbability: 0,
        mutateLinkWeightProbability: 0,
      }
      const config = createConfig(options)
      const genome = createGenome(config, state, genomeOptions)
      for (let i = 0; i < 50; i++) {
        genome.mutate()
      }
      return genome
    }
  })

  describe('DefaultNEATGenome constructor', () => {
    test('should correctly initialize', () => {
      const genome = createGenome(configProvider, state, genomeOptions)
      expect(genome).toBeDefined()
    })

    test('should properly initialize with default values', () => {
      const genome = createGenome(configProvider, state, genomeOptions)

      expect(genome.inputs.size).toBe(genomeOptions.inputs)
      expect(genome.outputs.size).toBe(genomeOptions.outputs)
      expect(genome.hiddenNodes.size).toBe(0)
      expect(genome.links.size).toBe(0)
    })

    describe('DefaultNEATGenome toJSON', () => {
      let inputNode: NodeFactoryOptions<null, null>
      let node1: NodeFactoryOptions<null, null>
      let outputNode: NodeFactoryOptions<null, null>
      let hiddenNodes: Array<GenomeDataNodeEntry<DefaultNEATGenome>>
      let links: Array<GenomeDataLinkEntry<DefaultNEATGenome>>
      let data: DefaultNEATGenomeData

      beforeEach(() => {
        inputNode = { id: 0, type: NodeType.Input }
        node1 = { id: 1, type: NodeType.Hidden }
        outputNode = { id: 0, type: NodeType.Output }
        hiddenNodes = [[nodeRefToKey(node1), node1]]
        links = [
          [
            nodeRefsToLinkKey(inputNode, node1),
            [nodeRefToKey(inputNode), nodeRefToKey(node1), 1, 1],
          ],
          [
            nodeRefsToLinkKey(node1, outputNode),
            [nodeRefToKey(node1), nodeRefToKey(outputNode), 1, 1],
          ],
        ]
        data = {
          ...defaultData,
          hiddenNodes,
          links,
          isSafe: true,
        }
      })

      test('should properly hydrate from given data', () => {
        const genome = createGenome(configProvider, state, genomeOptions, data)
        expect(genome.hiddenNodes.size).toBe(data.hiddenNodes.length)
        expect(genome.links.size).toBe(data.links.length)
      })
      test('should match exported data after hydrating', () => {
        const genome = createGenome(configProvider, state, genomeOptions, data)
        expect(genome.toJSON()).toEqual(data)
      })
    })
  })

  describe('mutationAddLink', () => {
    let hiddenNodes: Array<GenomeDataNodeEntry<DefaultNEATGenome>>
    let links: Array<GenomeDataLinkEntry<DefaultNEATGenome>>
    let data: DefaultNEATGenomeData

    beforeEach(() => {
      hiddenNodes = []
      links = []
      data = {
        ...defaultData,
        hiddenNodes,
        links,
      }
    })
    test('should add a new link with fresh genome', () => {
      // Arrange
      const genome = createGenome(configProvider, state, genomeOptions)

      // Act
      genome.mutationAddLink()

      // Assert
      const x = genome.config.neat().initialLinkWeightSize
      expect(genome.links.size).toBe(1)
      const newLink = Array.from(genome.links.values())[0] as NEATLink
      expect(newLink.from.type).toBe('Input')
      expect(newLink.to.type).toBe('Output')
      expect(newLink.weight).toBeGreaterThanOrEqual(-x)
      expect(newLink.weight).toBeLessThanOrEqual(x)
      expect(newLink.innovation).toBe(0)
    })

    test('should correctly generate and assign innovation numbers', () => {
      // Arrange
      const genome = createGenome(configProvider, state, genomeOptions)

      // Act
      genome.mutationAddLink()

      // Assert
      expect(genome.state.nextInnovation.innovationNumber).toBe(1)
      expect(genome.state.nextInnovation.nodeNumber).toBe(0)
    })

    describe('mutationAddNode', () => {
      test('should add a new node with fresh genome', () => {
        // Arrange
        const genome = createGenome(configProvider, state, genomeOptions)

        // Act
        genome.mutationAddLink()
        genome.mutationAddNode()

        // Assert
        const inputNode = Array.from(genome.inputs.values())[0] as NEATNode
        const hiddenNode = Array.from(
          genome.hiddenNodes.values()
        )[0] as NEATNode
        const outputNode = Array.from(genome.outputs.values())[0] as NEATNode
        const links = Array.from(genome.links.values()) as NEATLink[]
        expect(links.length).toBe(2)
        expect(links[0]?.from).toBe(hiddenNode)
        expect(links[0]?.to).toBe(outputNode)
        expect(links[1]?.from).toBe(inputNode)
        expect(links[1]?.to).toBe(hiddenNode)
      })

      test('should correctly configure links, hiddenNodes and connections', () => {
        // Arrange
        const genome = createGenome(configProvider, state, genomeOptions)

        // Act
        genome.mutationAddLink()
        genome.mutationAddNode()

        // Assert
        expect(genome.links.size).toBe(2)
        // expect(Array.from(genome.links.entries())).toEqual([
        //   [
        //     'Hidden[0] -> Output[0]',
        //     {
        //       from: { type: 'Hidden', id: 0, config: null, state: null },
        //       to: { type: 'Output', id: 0, config: null, state: null },
        //       weight: 1,
        //       innovation: 2,
        //       config: null,
        //       state: null,
        //     },
        //   ],
        //   [
        //     'Input[0] -> Hidden[0]',
        //     {
        //       from: { type: 'Input', id: 0, config: null, state: null },
        //       to: { type: 'Hidden', id: 0, config: null, state: null },
        //       weight: 0.3142634861380056,
        //       innovation: 1,
        //       config: null,
        //       state: null,
        //     },
        //   ],
        // ]);
        expect(genome.hiddenNodes.size).toBe(1)
        // expect(Array.from(genome.hiddenNodes.entries())).toEqual([
        //   ['Hidden[0]', { type: 'Hidden', id: 0, config: null, state: null }],
        // ]);
        expect(Array.from(genome.connections.nodes())).toHaveLength(3)
        // expect(Array.from(genome.connections.nodes())).toEqual([
        //   {
        //     config: null,
        //     id: 0,
        //     state: null,
        //     type: 'Hidden',
        //   },
        //   {
        //     config: null,
        //     id: 0,
        //     state: null,
        //     type: 'Output',
        //   },
        //   {
        //     config: null,
        //     id: 0,
        //     state: null,
        //     type: 'Input',
        //   },
        // ])
      })

      test('should correctly generate and assign innovation numbers', () => {
        // Arrange
        const genome = createGenome(configProvider, state, genomeOptions)

        // Act
        genome.mutationAddLink()
        genome.mutationAddNode()

        // Assert
        expect(genome.state.nextInnovation.innovationNumber).toBe(4)
        expect(genome.state.nextInnovation.nodeNumber).toBe(1)
      })
    })

    describe('mutationRemoveNode', () => {
      test('should remove a new node with fresh genome', () => {
        // Arrange
        const genome = createGenome(configProvider, state, genomeOptions)

        // Act
        genome.mutationAddLink()
        genome.mutationAddNode()
        genome.mutationRemoveNode()

        // Assert
        expect(Array.from(genome.links.entries())).toEqual([])
        expect(Array.from(genome.hiddenNodes.entries())).toEqual([])
        expect(Array.from(genome.connections.nodes())).toEqual([])
      })

      test('should correctly generate and assign innovation numbers', () => {
        // Arrange
        const genome = createGenome(configProvider, state, genomeOptions)

        // Act
        genome.mutationAddLink()
        genome.mutationAddNode()
        genome.mutationRemoveNode()

        // Assert
        expect(genome.state.nextInnovation.innovationNumber).toBe(4)
        expect(genome.state.nextInnovation.nodeNumber).toBe(1)
      })
    })

    describe('mutationRemoveLink', () => {
      test('should remove a link from a fresh genome', () => {
        // Arrange
        const genome = createGenome(configProvider, state, genomeOptions)

        // Act
        genome.mutationAddLink()
        expect(genome.links.size).toBe(1)

        genome.mutationRemoveLink()
        expect(genome.links.size).toBe(0)
      })

      test('should correctly generate and assign innovation numbers', () => {
        // Arrange
        const genome = createGenome(configProvider, state, genomeOptions)

        // Act
        genome.mutationAddLink()
        genome.mutationRemoveLink()

        // Assert
        expect(genome.state.nextInnovation.innovationNumber).toBe(1)
        expect(genome.state.nextInnovation.nodeNumber).toBe(0)
      })

      test('should remove a link from a seasoned genome', () => {
        const options = {
          ...configProvider.config,
          addNodeProbability: 1,
          addLinkProbability: 1,
          removeLinkProbability: 0,
          removeNodeProbability: 0,
          mutateLinkWeightProbability: 0,
        }
        const genome = createSeasonedGenome()
        const size = genome.links.size
        genome.mutationRemoveLink()
        expect(genome.links.size).toBe(size - 1)
      })
    })
  })

  describe('DefaultNEATGenome distance function', () => {
    test('should return zero for identical genomes', () => {
      const genome1 = createGenome(configProvider, state, genomeOptions)
      const genome2 = createGenome(configProvider, state, genomeOptions)
      expect(genome1.distance(genome2)).toBe(0)
    })

    test('should return non-zero for different genomes', () => {
      const genome1 = createSeasonedGenome()
      const genome2 = createSeasonedGenome()

      expect(genome1.distance(genome2)).toBeGreaterThan(0)
    })
  })

  describe('DefaultNEATGenome crossover function', () => {
    test('should correctly perform basic crossover where the fitter parent dominates', () => {
      // Given: Two distinct genomes with different fitness levels
      const parent1 = createSeasonedGenome()
      const parent2 = createSeasonedGenome()
      const fitness = 10
      const otherFitness = 5

      // When: Performing crossover
      const child = parent1.crossover(parent2, fitness, otherFitness)

      // Then: The child should mostly resemble parent1
      expect(child.links.size).toBe(parent1.links.size)
      expect(child.hiddenNodes.size).toBe(parent1.hiddenNodes.size)
      expect(child.inputs.size).toBe(parent1.inputs.size)
      expect(child.outputs.size).toBe(parent1.outputs.size)
      // expect(child.connections).toEqual(parent1.connections);
    })

    test('should correctly perform crossover with overlapping links and nodes', () => {
      // Given: Two genomes with overlapping links and nodes, and different fitness levels
      const parent1 = createSeasonedGenome()
      const parent2 = createSeasonedGenome()
      const fitness = 10
      const otherFitness = 5

      // When: Performing crossover
      const child = parent1.crossover(parent2, fitness, otherFitness)

      // Then: Validate that the child's nodes and links are a correct crossover of the parents
      // For simplicity, I'm just checking sizes here, you would want to check the actual values.
      expect(child.links.size).toBeGreaterThanOrEqual(parent1.links.size)
      expect(child.hiddenNodes.size).toBeGreaterThanOrEqual(
        parent1.hiddenNodes.size
      )
    })
  })
})
