import {
  Connections,
  isActionEdge,
  PhenotypeActionType,
  type PhenotypeAction,
  type PhenotypeFactory,
} from '@neat-evolution/core'
import { createPhenotype as createCPPNPhenotype } from '@neat-evolution/cppn'
import type { CPPNGenome, CPPNGenomeOptions } from '@neat-evolution/cppn'
import { createSyncExecutor } from '@neat-evolution/executor'
import {
  parseNodes,
  toPointKey,
  type PointKey,
  fromPointKey,
  type Point,
} from '@neat-evolution/hyperneat'

import type { ESHyperNEATGenomeOptions } from './ESHyperNEATGenomeOptions.js'
import { exploreSubstrate } from './search/exploreSubstrate.js'

export const createPhenotype: PhenotypeFactory<
  CPPNGenome<ESHyperNEATGenomeOptions>
> = (genome) => {
  const initConfig = genome.genomeOptions.initConfig
  if (initConfig == null) {
    throw new Error('initConfig is required')
  }
  const inputNodes = parseNodes(
    genome.genomeOptions.inputConfig,
    genome.genomeOptions.resolution,
    initConfig.inputs,
    -1.0
  )
  const outputNodes = parseNodes(
    genome.genomeOptions.outputConfig,
    genome.genomeOptions.resolution,
    initConfig.outputs,
    1.0
  )
  const depth = genome.genomeOptions.iterationLevel + 1

  const cppn = createSyncExecutor(
    createCPPNPhenotype(genome as unknown as CPPNGenome<CPPNGenomeOptions>)
  )

  const [layers, forwardConnections] = exploreSubstrate(
    inputNodes,
    outputNodes,
    cppn,
    depth,
    false,
    false,
    genome.genomeOptions
  )

  const [reverseLayers, reverseConnections] = exploreSubstrate(
    outputNodes,
    inputNodes,
    cppn,
    1,
    true,
    false,
    genome.genomeOptions
  )

  const connections = new Connections<PointKey, number>(forwardConnections)
  connections.extend(new Connections<PointKey, number>(reverseConnections))

  const inputNodeKeys = new Set<PointKey>()
  const nodes = new Set<PointKey>()
  for (const node of inputNodes) {
    const nodeKey = toPointKey(node)
    inputNodeKeys.add(nodeKey)
    nodes.add(nodeKey)
  }
  const outputNodeKeys = new Set<PointKey>()
  for (const node of outputNodes) {
    outputNodeKeys.add(toPointKey(node))
  }

  const pruned = connections.prune(inputNodeKeys, outputNodeKeys, true)

  for (let i = 1; i < layers.length; i++) {
    const layer = layers[i] as Point[]
    for (const node of layer) {
      const nodeKey = toPointKey(node)
      if (!pruned.has(nodeKey)) {
        nodes.add(nodeKey)
      }
    }
  }

  for (const layer of reverseLayers) {
    for (const node of layer) {
      const nodeKey = toPointKey(node)
      if (!pruned.has(nodeKey)) {
        nodes.add(nodeKey)
      }
    }
  }

  for (const node of outputNodes) {
    nodes.add(toPointKey(node))
  }

  const firstOutputId = nodes.size - outputNodes.length
  const inputs = []
  for (let i = 0; i < inputNodes.length; i++) {
    inputs.push(i)
  }

  const outputs = []
  for (let i = firstOutputId; i < firstOutputId + outputNodes.length; i++) {
    outputs.push(i)
  }

  const nodeMapping = new Map<PointKey, number>()
  let i = 0
  for (const node of nodes) {
    nodeMapping.set(node, i)
    i++
  }

  const actions: PhenotypeAction[] = []
  for (const action of connections.sortTopologically()) {
    if (isActionEdge(action)) {
      const fromIndex = nodeMapping.get(action[0]) as number
      const toIndex = nodeMapping.get(action[1]) as number
      actions.push({
        type: PhenotypeActionType.Link,
        from: fromIndex,
        to: toIndex,
        weight: action[2],
      })
    } else {
      const nodeIndex = nodeMapping.get(action[0]) as number
      const [x, y] = fromPointKey(action[0])
      const [, bias] = cppn([
        0.0,
        0.0,
        x / genome.genomeOptions.resolution,
        y / genome.genomeOptions.resolution,
      ]) as [weight: number, bias: number]
      actions.push({
        type: PhenotypeActionType.Activation,
        node: nodeIndex,
        bias,
        activation:
          nodeIndex < firstOutputId
            ? genome.genomeOptions.hiddenActivation
            : genome.genomeOptions.outputActivation,
      })
    }
  }

  return {
    length: nodes.size,
    inputs,
    outputs,
    actions,
  }
}
