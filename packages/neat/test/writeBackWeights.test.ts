import {
  defaultNEATConfigOptions,
  type InitConfig,
  isActionEdge,
  NodeType,
  nodeTupleToKey,
  type PhenotypeAction,
  PhenotypeActionType,
  toLinkKey,
} from '@neat-evolution/core'
import { createRNG } from '@neat-evolution/utils'
import { beforeEach, describe, expect, test } from 'vitest'
import {
  createConfig,
  createGenome,
  createPhenotype,
  createState,
  defaultNEATGenomeOptions,
  type NEATGenome,
  type NEATGenomeOptions,
  type NEATState,
} from '../src/index.js'
import { NEATAlgorithm } from '../src/NEATAlgorithm.js'

describe('NEATAlgorithm.writeBackWeights', () => {
  let stateProvider: NEATState
  let genomeOptions: NEATGenomeOptions
  const initConfig: InitConfig = {
    inputs: 2,
    outputs: 1,
  }

  let createGenomeWithLinks: () => Promise<NEATGenome>

  beforeEach(() => {
    genomeOptions = { ...defaultNEATGenomeOptions }
    stateProvider = createState()

    createGenomeWithLinks = async () => {
      const configOptions = {
        ...defaultNEATConfigOptions,
        addNodeProbability: 0,
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
      // Add enough links to connect inputs to output
      await genome.mutationAddLink(createRNG('test'))
      await genome.mutationAddLink(createRNG('test'))
      return genome
    }
  })

  test('updates link weights in the genome', async () => {
    const genome = await createGenomeWithLinks()
    const phenotype = createPhenotype(genome)

    // Build updatedActions: copy phenotype actions but change weights for Link actions
    const trainedWeight = 99.5
    const updatedActions: PhenotypeAction[] = phenotype.actions.map(
      (action) => {
        if (action[0] === PhenotypeActionType.Link) {
          return [PhenotypeActionType.Link, action[1], action[2], trainedWeight]
        }
        return action
      }
    )

    NEATAlgorithm.writeBackWeights(genome, { actions: updatedActions })

    // All links in the genome should now have the trained weight
    for (const link of genome.links.values()) {
      expect(link.weight).toBe(trainedWeight)
    }
  })

  test('updates connection graph edges', async () => {
    const genome = await createGenomeWithLinks()
    const phenotype = createPhenotype(genome)

    const trainedWeight = 42.0
    const updatedActions: PhenotypeAction[] = phenotype.actions.map(
      (action) => {
        if (action[0] === PhenotypeActionType.Link) {
          return [PhenotypeActionType.Link, action[1], action[2], trainedWeight]
        }
        return action
      }
    )

    NEATAlgorithm.writeBackWeights(genome, { actions: updatedActions })

    // All edges in the connections graph should reflect the trained weight
    const order = genome.connections.sortTopologically()
    for (const action of order) {
      if (isActionEdge(action)) {
        const [from, to, edge] = action
        expect(edge).toBe(trainedWeight)
        // Also verify via getEdge
        expect(genome.connections.getEdge(from, to)).toBe(trainedWeight)
      }
    }
  })

  test('ignores Activation actions (non-Link entries)', async () => {
    const genome = await createGenomeWithLinks()
    const phenotype = createPhenotype(genome)

    // Record original weights before calling writeBackWeights
    const originalWeights = new Map<string, number>()
    for (const [key, link] of genome.links.entries()) {
      originalWeights.set(String(key), link.weight)
    }

    // Build updatedActions where all actions are Activation type (no Link actions)
    // This simulates a case where no Link updates are present
    const updatedActions: PhenotypeAction[] = phenotype.actions.map(
      (action) => {
        // Replace every Link action with an Activation action (wrong type)
        if (action[0] === PhenotypeActionType.Link) {
          return [
            PhenotypeActionType.Activation,
            action[1],
            0,
            genomeOptions.hiddenActivation,
          ]
        }
        return action
      }
    )

    NEATAlgorithm.writeBackWeights(genome, { actions: updatedActions })

    // Weights should be unchanged since no Link actions were provided
    for (const [key, link] of genome.links.entries()) {
      expect(link.weight).toBe(originalWeights.get(String(key)))
    }
  })

  test('handles empty updatedActions gracefully', async () => {
    const genome = await createGenomeWithLinks()

    // Record original weights
    const originalWeights = new Map<string, number>()
    for (const [key, link] of genome.links.entries()) {
      originalWeights.set(String(key), link.weight)
    }

    // Pass empty array — should not throw and should leave weights unchanged
    expect(() => {
      NEATAlgorithm.writeBackWeights(genome, { actions: [] })
    }).not.toThrow()

    for (const [key, link] of genome.links.entries()) {
      expect(link.weight).toBe(originalWeights.get(String(key)))
    }
  })

  test('writes back weights using explicit factory options genome', () => {
    const inputNode0 = nodeTupleToKey([NodeType.Input, 0])
    const inputNode1 = nodeTupleToKey([NodeType.Input, 1])
    const outputNode = nodeTupleToKey([NodeType.Output, 0])

    const weight0 = 0.5
    const weight1 = -0.3

    const genome = createGenome(
      createConfig({ neat: defaultNEATConfigOptions }),
      stateProvider,
      genomeOptions,
      initConfig,
      {
        hiddenNodes: [],
        links: [
          [inputNode0, outputNode, weight0, toLinkKey(inputNode0, outputNode)],
          [inputNode1, outputNode, weight1, toLinkKey(inputNode1, outputNode)],
        ],
      }
    )

    expect(genome.links.size).toBe(2)

    const phenotype = createPhenotype(genome)

    const newWeight0 = 7.7
    const newWeight1 = -2.2
    let linkActionCount = 0
    const updatedActions: PhenotypeAction[] = phenotype.actions.map(
      (action) => {
        if (action[0] === PhenotypeActionType.Link) {
          const newWeight = linkActionCount === 0 ? newWeight0 : newWeight1
          linkActionCount++
          return [PhenotypeActionType.Link, action[1], action[2], newWeight]
        }
        return action
      }
    )

    NEATAlgorithm.writeBackWeights(genome, { actions: updatedActions })

    // Verify all link weights were updated to one of the new weights
    const updatedWeights = Array.from(genome.links.values()).map(
      (link) => link.weight
    )
    expect(updatedWeights).toContain(newWeight0)
    expect(updatedWeights).toContain(newWeight1)
    expect(updatedWeights).not.toContain(weight0)
    expect(updatedWeights).not.toContain(weight1)
  })
})
