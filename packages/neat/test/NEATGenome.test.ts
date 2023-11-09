import {
  defaultNEATConfigOptions,
  NodeType,
  type InitConfig,
  nodeTupleToKey,
  nodeRefToKey,
  type NodeRefTuple,
} from '@neat-evolution/core'
import { beforeEach, describe, expect, test } from 'vitest'

import { createConfig } from '../src/createConfig.js'
import { createGenome } from '../src/createGenome.js'
import { createState } from '../src/createState.js'
import type { NEATConfig } from '../src/NEATConfig.js'
import type { NEATGenome } from '../src/NEATGenome.js'
import type { NEATGenomeData } from '../src/NEATGenomeData.js'
import type {
  NEATHiddenNodeData,
  NEATLinkData,
} from '../src/NEATGenomeFactoryOptions.js'
import {
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
} from '../src/NEATGenomeOptions.js'
import type { NEATLink } from '../src/NEATLink.js'
import type { NEATNode } from '../src/NEATNode.js'
import type { NEATState } from '../src/NEATState.js'

describe('NEATGenome class', () => {
  let configProvider: NEATConfig
  let initConfig: InitConfig
  let genomeOptions: NEATGenomeOptions
  let state: NEATState
  let defaultData: NEATGenomeData

  let createSeasonedGenome: () => Promise<NEATGenome>

  beforeEach(() => {
    configProvider = createConfig({ neat: defaultNEATConfigOptions })
    state = createState()
    initConfig = {
      inputs: 1,
      outputs: 1,
    }
    genomeOptions = {
      ...defaultNEATGenomeOptions,
    }
    defaultData = {
      config: configProvider.toJSON(),
      state: state.toJSON(),
      genomeOptions,
      factoryOptions: {
        hiddenNodes: [],
        links: [],
      },
    }
    createSeasonedGenome = async () => {
      const options = {
        ...configProvider.neatConfig,
        addNodeProbability: 1,
        addLinkProbability: 1,
        removeLinkProbability: 0,
        removeNodeProbability: 0,
        mutateLinkWeightProbability: 0,
      }
      const config = createConfig({ neat: options })
      const genome = createGenome(config, state, genomeOptions, initConfig)
      for (let i = 0; i < 50; i++) {
        await genome.mutate()
      }
      return genome
    }
  })

  describe('NEATGenome constructor', () => {
    test('should correctly initialize', () => {
      const genome = createGenome(
        configProvider,
        state,
        genomeOptions,
        initConfig
      )
      expect(genome).toBeDefined()
    })

    test('should properly initialize with default values', () => {
      const genome = createGenome(
        configProvider,
        state,
        genomeOptions,
        initConfig
      )

      expect(genome.inputs.size).toBe(initConfig.inputs)
      expect(genome.outputs.size).toBe(initConfig.outputs)
      expect(genome.hiddenNodes.size).toBe(0)
      expect(genome.links.size).toBe(0)
    })

    describe('NEATGenome toJSON', () => {
      let inputNode: NodeRefTuple
      let node1: NodeRefTuple
      let outputNode: NodeRefTuple
      let hiddenNodes: NEATHiddenNodeData[]
      let links: NEATLinkData[]
      let data: NEATGenomeData

      beforeEach(() => {
        inputNode = [NodeType.Input, 0]
        node1 = [NodeType.Hidden, 1]
        outputNode = [NodeType.Output, 0]
        hiddenNodes = [node1[1]]
        links = [
          [nodeTupleToKey(inputNode), nodeTupleToKey(node1), 1, 1],
          [nodeTupleToKey(node1), nodeTupleToKey(outputNode), 1, 1],
        ]
        data = {
          ...defaultData,
          factoryOptions: { hiddenNodes, links },
        }
      })

      test('should properly hydrate from given data', () => {
        const genome = createGenome(
          configProvider,
          state,
          genomeOptions,
          initConfig,
          data.factoryOptions
        )
        expect(genome.hiddenNodes.size).toBe(
          data.factoryOptions.hiddenNodes.length
        )
        expect(genome.links.size).toBe(data.factoryOptions.links.length)
      })
      test('should match exported data after hydrating', () => {
        const genome = createGenome(
          configProvider,
          state,
          genomeOptions,
          initConfig,
          data.factoryOptions
        )
        expect(genome.toJSON()).toEqual(data)
      })
    })
  })

  describe('mutationAddLink', () => {
    let hiddenNodes: NEATHiddenNodeData[]
    let links: NEATLinkData[]
    let data: NEATGenomeData

    beforeEach(() => {
      hiddenNodes = []
      links = []
      data = {
        ...defaultData,
        factoryOptions: { hiddenNodes, links },
      }
    })
    test('should add a new link with fresh genome', async () => {
      const genome = createGenome(
        configProvider,
        state,
        genomeOptions,
        initConfig
      )

      await genome.mutationAddLink()

      const x = genome.config.neat().initialLinkWeightSize
      expect(genome.links.size).toBe(1)
      const newLink = Array.from(genome.links.values())[0] as NEATLink
      expect(newLink.from[0]).toBe('I')
      expect(newLink.to[0]).toBe('O')
      expect(newLink.weight).toBeGreaterThanOrEqual(-x)
      expect(newLink.weight).toBeLessThanOrEqual(x)
      expect(newLink.innovation).toBe(0)
    })

    test('should correctly generate and assign innovation numbers', () => {
      const genome = createGenome(
        configProvider,
        state,
        genomeOptions,
        initConfig
      )

      genome.mutationAddLink()

      expect(genome.state.nextInnovation.innovationNumber).toBe(1)
      expect(genome.state.nextInnovation.nodeNumber).toBe(0)
    })

    describe('mutationAddNode', () => {
      test('should add a new node with fresh genome', async () => {
        const genome = createGenome(
          configProvider,
          state,
          genomeOptions,
          initConfig
        )

        await genome.mutationAddLink()
        await genome.mutationAddNode()

        const inputNode = Array.from(genome.inputs.values())[0] as NEATNode
        const hiddenNode = Array.from(
          genome.hiddenNodes.values()
        )[0] as NEATNode
        const outputNode = Array.from(genome.outputs.values())[0] as NEATNode
        const links = Array.from(genome.links.values()) as NEATLink[]
        expect(links.length).toBe(2)
        expect(links[0]?.from).toBe(nodeRefToKey(hiddenNode))
        expect(links[0]?.to).toBe(nodeRefToKey(outputNode))
        expect(links[1]?.from).toBe(nodeRefToKey(inputNode))
        expect(links[1]?.to).toBe(nodeRefToKey(hiddenNode))
      })

      test('should correctly configure links, hiddenNodes and connections', async () => {
        const genome = createGenome(
          configProvider,
          state,
          genomeOptions,
          initConfig
        )

        await genome.mutationAddLink()
        await genome.mutationAddNode()

        expect(genome.links.size).toBe(2)
        expect(genome.hiddenNodes.size).toBe(1)
        expect(Array.from(genome.connections.nodes())).toHaveLength(3)
      })

      test('should correctly generate and assign innovation numbers', async () => {
        const genome = createGenome(
          configProvider,
          state,
          genomeOptions,
          initConfig
        )

        await genome.mutationAddLink()
        await genome.mutationAddNode()

        expect(genome.state.nextInnovation.innovationNumber).toBe(4)
        expect(genome.state.nextInnovation.nodeNumber).toBe(1)
      })
    })

    describe('mutationRemoveNode', () => {
      test('should remove a new node with fresh genome', async () => {
        const genome = createGenome(
          configProvider,
          state,
          genomeOptions,
          initConfig
        )

        await genome.mutationAddLink()
        await genome.mutationAddNode()
        genome.mutationRemoveNode()

        expect(Array.from(genome.links.entries())).toEqual([])
        expect(Array.from(genome.hiddenNodes.entries())).toEqual([])
        expect(Array.from(genome.connections.nodes())).toEqual([])
      })

      test('should correctly generate and assign innovation numbers', async () => {
        const genome = createGenome(
          configProvider,
          state,
          genomeOptions,
          initConfig
        )

        await genome.mutationAddLink()
        await genome.mutationAddNode()
        genome.mutationRemoveNode()

        expect(genome.state.nextInnovation.innovationNumber).toBe(4)
        expect(genome.state.nextInnovation.nodeNumber).toBe(1)
      })
    })

    describe('mutationRemoveLink', () => {
      test('should remove a link from a fresh genome', async () => {
        const genome = createGenome(
          configProvider,
          state,
          genomeOptions,
          initConfig
        )

        await genome.mutationAddLink()
        expect(genome.links.size).toBe(1)

        genome.mutationRemoveLink()
        expect(genome.links.size).toBe(0)
      })

      test('should correctly generate and assign innovation numbers', async () => {
        const genome = createGenome(
          configProvider,
          state,
          genomeOptions,
          initConfig
        )

        await genome.mutationAddLink()
        genome.mutationRemoveLink()

        expect(genome.state.nextInnovation.innovationNumber).toBe(1)
        expect(genome.state.nextInnovation.nodeNumber).toBe(0)
      })

      test('should remove a link from a seasoned genome', async () => {
        const genome = await createSeasonedGenome()
        const size = genome.links.size
        genome.mutationRemoveLink()
        expect(genome.links.size).toBe(size - 1)
      })
    })
  })
})
