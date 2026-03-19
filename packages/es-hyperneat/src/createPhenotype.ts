import {
  Connections,
  isActionEdge,
  type LinkCoord,
  type NodeCoord,
  type Phenotype,
  type PhenotypeAction,
  PhenotypeActionType,
  type PhenotypeFactory,
  resolveOutputActivation,
  type WritebackPayload,
} from '@neat-evolution/core'
import type {
  CPPNContext,
  CPPNGenome,
  CPPNGenomeOptions,
} from '@neat-evolution/cppn'
import { createPhenotype as createCPPNPhenotype } from '@neat-evolution/cppn'
import {
  createExecutor,
  createTrainableExecutor,
  type TrainableExecutor,
} from '@neat-evolution/executor'
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

  const cppnPhenotype = createCPPNPhenotype(
    genome as unknown as CPPNGenome<CPPNGenomeOptions>
  )
  const cppn = createExecutor(cppnPhenotype)

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

  const resolution = genome.genomeOptions.resolution
  const actions: PhenotypeAction[] = []
  const linkCoords: LinkCoord[] = []
  const nodeCoords: NodeCoord[] = []
  let actionIndex = 0

  for (const action of connections.sortTopologically()) {
    if (isActionEdge(action)) {
      const fromIndex = nodeMapping.get(action[0]) as number
      const toIndex = nodeMapping.get(action[1]) as number
      // Look up raw coordinates and normalize to match CPPN query space
      const fromPoint = pointById.get(action[0])
      const toPoint = pointById.get(action[1])
      if (fromPoint !== undefined && toPoint !== undefined) {
        linkCoords.push({
          actionIndex,
          x0: fromPoint[0] / resolution,
          y0: fromPoint[1] / resolution,
          x1: toPoint[0] / resolution,
          y1: toPoint[1] / resolution,
        })
      }
      actions.push([PhenotypeActionType.Link, fromIndex, toIndex, action[2]])
      actionIndex++
    } else {
      const nodeIndex = nodeMapping.get(action[0]) as number
      const point = pointById.get(action[0]) as Point
      const normalizedX = point[0] / resolution
      const normalizedY = point[1] / resolution
      const [, bias] = cppn.forward([0.0, 0.0, normalizedX, normalizedY]) as [
        weight: number,
        bias: number,
      ]
      nodeCoords.push({ actionIndex, x: normalizedX, y: normalizedY })
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
      actionIndex++
    }
  }

  // Lazy CPPN TrainableExecutor — only created on first backward call, cached for reuse
  let cppnTrainableExecutor: TrainableExecutor | undefined

  const result: Phenotype = {
    length: nodes.size,
    inputs,
    outputs,
    actions,
    coordinateMap: { linkCoords, nodeCoords, cppnPhenotype },
  }

  // Gradient averaging: divide lr by coordinate count so CPPN training rate
  // is independent of substrate size
  const coordinateCount = linkCoords.length + nodeCoords.length
  const cppnLrScale = coordinateCount > 0 ? 1 / coordinateCount : 1
  const baseCppnLr = genome.genomeOptions.cppnLearningRate

  // Pre-allocate error buffers for CPPN backward (avoid per-coordinate allocation)
  const linkError = new Float64Array(2) // [grad, 0] for weight output
  const nodeError = new Float64Array(2) // [0, grad] for bias output

  result.chainBackward = (gradients: Float64Array, lr: number): void => {
    if (cppnTrainableExecutor === undefined) {
      cppnTrainableExecutor = createTrainableExecutor(cppnPhenotype)
    }
    // Accumulate gradients across all coordinates, then apply one coherent update
    cppnTrainableExecutor.zeroGradients()
    for (const lc of linkCoords) {
      const grad = gradients[lc.actionIndex]
      if (grad === undefined || grad === 0) continue
      cppnTrainableExecutor.forward([lc.x0, lc.y0, lc.x1, lc.y1])
      linkError[0] = grad
      cppnTrainableExecutor.accumulateBackward(linkError)
    }
    for (const nc of nodeCoords) {
      const grad = gradients[nc.actionIndex]
      if (grad === undefined || grad === 0) continue
      cppnTrainableExecutor.forward([0.0, 0.0, nc.x, nc.y])
      nodeError[1] = grad
      cppnTrainableExecutor.accumulateBackward(nodeError)
    }
    cppnTrainableExecutor.applyGradients((baseCppnLr ?? lr) * cppnLrScale)
  }

  result.transformWriteback = (): WritebackPayload | undefined => {
    if (cppnTrainableExecutor === undefined) return undefined
    return cppnTrainableExecutor.getUpdatedActions()
  }

  return result
}
