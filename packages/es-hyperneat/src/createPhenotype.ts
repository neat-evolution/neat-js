import {
  Connections,
  isActionEdge,
  type PhenotypeAction,
  PhenotypeActionType,
  type PhenotypeFactory,
  resolveOutputActivation,
} from '@neat-evolution/core'
import type {
  CPPNContext,
  CPPNGenome,
  CPPNGenomeOptions,
} from '@neat-evolution/cppn'
import { createPhenotype as createCPPNPhenotype } from '@neat-evolution/cppn'
import { createExecutor } from '@neat-evolution/executor'
import { type Point, parseNodes } from '@neat-evolution/hyperneat'

import type { ESHyperNEATGenomeOptions } from './ESHyperNEATGenomeOptions.js'
import { exploreSubstrate } from './search/exploreSubstrate.js'

export const createPhenotype: PhenotypeFactory<
  CPPNGenome<ESHyperNEATGenomeOptions>,
  CPPNContext<ESHyperNEATGenomeOptions>
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

  const cppn = createExecutor(
    createCPPNPhenotype(genome as unknown as CPPNGenome<CPPNGenomeOptions>)
  )

  const pointIdByX = new Map<number, Map<number, number>>()
  const pointById = new Map<number, Point>()
  let nextPointId = 0
  const getOrCreatePointId = (point: Point): number => {
    const [x, y] = point
    let yMap = pointIdByX.get(x)
    if (yMap == null) {
      yMap = new Map<number, number>()
      pointIdByX.set(x, yMap)
    }
    const existing = yMap.get(y)
    if (existing != null) return existing
    const id = nextPointId
    nextPointId++
    yMap.set(y, id)
    pointById.set(id, point)
    return id
  }

  const [layers, forwardConnections] = exploreSubstrate(
    inputNodes,
    outputNodes,
    cppn,
    depth,
    false,
    false,
    genome.genomeOptions,
    getOrCreatePointId
  )

  const [reverseLayers, reverseConnections] = exploreSubstrate(
    outputNodes,
    inputNodes,
    cppn,
    1,
    true,
    false,
    genome.genomeOptions,
    getOrCreatePointId
  )

  const connections = new Connections<number, number>(forwardConnections)
  connections.extend(new Connections<number, number>(reverseConnections))

  const inputNodeKeys = new Set<number>()
  const nodes = new Set<number>()
  for (const node of inputNodes) {
    const nodeKey = getOrCreatePointId(node)
    inputNodeKeys.add(nodeKey)
    nodes.add(nodeKey)
  }
  const outputNodeKeys = new Set<number>()
  for (const node of outputNodes) {
    outputNodeKeys.add(getOrCreatePointId(node))
  }

  const pruned = connections.prune(inputNodeKeys, outputNodeKeys, true)

  for (let i = 1; i < layers.length; i++) {
    const layer = layers[i] as Point[]
    for (const node of layer) {
      const nodeKey = getOrCreatePointId(node)
      if (!pruned.has(nodeKey)) {
        nodes.add(nodeKey)
      }
    }
  }

  for (const layer of reverseLayers) {
    for (const node of layer) {
      const nodeKey = getOrCreatePointId(node)
      if (!pruned.has(nodeKey)) {
        nodes.add(nodeKey)
      }
    }
  }

  for (const node of outputNodes) {
    nodes.add(getOrCreatePointId(node))
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

  const nodeMapping = new Map<number, number>()
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
      actions.push([PhenotypeActionType.Link, fromIndex, toIndex, action[2]])
    } else {
      const nodeIndex = nodeMapping.get(action[0]) as number
      const [x, y] = pointById.get(action[0]) as Point
      const [, bias] = cppn.execute([
        0.0,
        0.0,
        x / genome.genomeOptions.resolution,
        y / genome.genomeOptions.resolution,
      ]) as [weight: number, bias: number]
      actions.push([
        PhenotypeActionType.Activation,
        nodeIndex,
        bias,
        nodeIndex < firstOutputId
          ? genome.genomeOptions.hiddenActivation
          : resolveOutputActivation(
              genome.genomeOptions.outputActivation,
              nodeIndex - firstOutputId
            ),
      ])
    }
  }

  return {
    length: nodes.size,
    inputs,
    outputs,
    actions,
  }
}
