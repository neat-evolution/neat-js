import {
  type Connection,
  Connections,
  isActionEdge,
  type NodeKey,
  NodeType,
  nodeKeyToId,
  nodeKeyToType,
  type Phenotype,
  type PhenotypeAction,
  PhenotypeActionType,
  type PhenotypeFactory,
  toLinkKey,
  toNodeKey,
} from '@neat-evolution/core'
import {
  type CPPNGenome,
  type CPPNGenomeOptions,
  createPhenotype as createCPPNPhenotype,
} from '@neat-evolution/cppn'
import {
  type ESHyperNEATGenomeOptions,
  exploreSubstrate,
} from '@neat-evolution/es-hyperneat'
import { createExecutor } from '@neat-evolution/executor'
import type { Point } from '@neat-evolution/hyperneat'
import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import type { DESHyperNEATGenome } from './DESHyperNEATGenome.js'
import type { DESHyperNEATLink } from './DESHyperNEATLink.js'
import { parseNodes } from './developer/parseNodes.js'

/** type NodePoint = [type: NodeType, id: number, x: number, y: number] */
type NodePointId = number
interface SubstratePointBucket {
  pointById: Map<number, Point>
  points: Point[]
}

export const createPhenotype: PhenotypeFactory<
  DESHyperNEATGenome,
  DESHyperNEATContext
> = (genome): Phenotype => {
  const initConfig = genome.genomeOptions.initConfig
  if (initConfig == null) {
    throw new Error('initConfig is required')
  }

  // from
  const r = genome.genomeOptions.resolution
  const inputNodes = parseNodes(
    genome.genomeOptions.inputConfig,
    r,
    initConfig.inputs
  )
  const outputNodes = parseNodes(
    genome.genomeOptions.outputConfig,
    r,
    initConfig.outputs
  )

  const pointIdByX = new Map<number, Map<number, number>>()
  let nextPointId = 0
  const getOrCreatePointId = (x: number, y: number): number => {
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
    return id
  }
  const getOrCreatePointIdFromPoint = (point: Point): number => {
    return getOrCreatePointId(point[0], point[1])
  }

  const nodePointIndexByNode = new Map<NodeKey, Map<number, number>>()
  let nextNodePointId = 0
  const getOrCreateNodePointId = (
    nodeKey: NodeKey,
    pointId: number
  ): NodePointId => {
    let pointIndex = nodePointIndexByNode.get(nodeKey)
    if (pointIndex == null) {
      pointIndex = new Map<number, number>()
      nodePointIndexByNode.set(nodeKey, pointIndex)
    }
    const existing = pointIndex.get(pointId)
    if (existing != null) return existing
    const id = nextNodePointId
    nextNodePointId++
    pointIndex.set(pointId, id)
    return id
  }
  const getNodePointIdFromPoint = (
    nodeKey: NodeKey,
    point: Point
  ): NodePointId => {
    return getOrCreateNodePointId(nodeKey, getOrCreatePointIdFromPoint(point))
  }

  const flattenedInputIds = new Set<number>()
  for (let i = 0; i < inputNodes.length; i++) {
    const nodeKey = toNodeKey(NodeType.Input, i)
    for (const node of inputNodes[i] as Point[]) {
      flattenedInputIds.add(getNodePointIdFromPoint(nodeKey, node))
    }
  }

  const flattenedOutputIds = new Set<number>()
  const outputNodesHash: Array<Set<number>> = []
  for (let i = 0; i < outputNodes.length; i++) {
    const outputNodeKey = toNodeKey(NodeType.Output, i)
    const pointIds = new Set<number>()
    for (const node of outputNodes[i] as Point[]) {
      const pointId = getOrCreatePointIdFromPoint(node)
      flattenedOutputIds.add(getOrCreateNodePointId(outputNodeKey, pointId))
      pointIds.add(pointId)
    }
    outputNodesHash.push(pointIds)
  }

  // Let the genome prepare to provide cppns and depth
  // deprecated genome.initDESGenome()

  // Init assembled network
  const assembledConnections = new Connections<NodePointId, number>()

  const createSubstratePointBucket = (): SubstratePointBucket => ({
    pointById: new Map<number, Point>(),
    points: [],
  })
  const addPointToBucket = (
    bucket: SubstratePointBucket,
    point: Point
  ): number => {
    const pointId = getOrCreatePointIdFromPoint(point)
    if (!bucket.pointById.has(pointId)) {
      bucket.pointById.set(pointId, point)
      bucket.points.push(point)
    }
    return pointId
  }

  // Init known nodes with the input and output nodes
  const substrateNodes = new Map<NodeKey, SubstratePointBucket>()
  for (const [i, nodes] of inputNodes.entries()) {
    const points = createSubstratePointBucket()
    for (const node of nodes) {
      addPointToBucket(points, node)
    }
    substrateNodes.set(toNodeKey(NodeType.Input, i), points)
  }
  for (const [i, nodes] of outputNodes.entries()) {
    const points = createSubstratePointBucket()
    for (const node of nodes) {
      addPointToBucket(points, node)
    }
    substrateNodes.set(toNodeKey(NodeType.Output, i), points)
  }
  // All hidden substrates are empty
  for (const nodeKey of genome.hiddenNodes.keys()) {
    substrateNodes.set(nodeKey, createSubstratePointBucket())
  }

  // Iterative network completion in topologically sorted order
  const order = genome.connections.sortTopologically()
  for (const action of order) {
    if (isActionEdge(action)) {
      const [sourceKey, targetKey] = action
      const targetType = nodeKeyToType(targetKey)
      const targetId = nodeKeyToId(targetKey)

      const cppnPhenotype = createCPPNPhenotype(
        genome.getLinkCPPN(
          sourceKey,
          targetKey
        ) as CPPNGenome<CPPNGenomeOptions>
      )
      const cppn = createExecutor(cppnPhenotype)

      let layers: Point[][]
      let connections: Array<Connection<number, number>>
      if (targetType === NodeType.Hidden) {
        const points = substrateNodes.get(sourceKey) as SubstratePointBucket
        ;[layers, connections] = exploreSubstrate(
          points.points,
          [],
          cppn,
          1,
          false,
          true,
          genome.genomeOptions as ESHyperNEATGenomeOptions,
          getOrCreatePointIdFromPoint
        )
      } else if (targetType === NodeType.Output) {
        const [layersReverse, connectionsReverse] = exploreSubstrate(
          outputNodes[targetId] as Point[],
          [],
          cppn,
          1,
          true,
          true,
          genome.genomeOptions as ESHyperNEATGenomeOptions,
          getOrCreatePointIdFromPoint
        )
        if ((genome.getDepth(targetKey) as number) > 0) {
          const points = substrateNodes.get(sourceKey) as SubstratePointBucket
          const [layersForward, connectionsForward] = exploreSubstrate(
            points.points,
            [],
            cppn,
            1,
            false,
            true,
            genome.genomeOptions as ESHyperNEATGenomeOptions,
            getOrCreatePointIdFromPoint
          )
          const outputSet = outputNodesHash[targetId] as Set<number>
          const mergedLayers1: Point[] = []
          if (layersForward.length > 1) {
            for (const node of layersForward[1] as Point[]) {
              if (!outputSet.has(getOrCreatePointIdFromPoint(node))) {
                mergedLayers1.push(node)
              }
            }
          }
          for (const node of layersReverse[1] as Point[]) {
            mergedLayers1.push(node)
          }
          const mergedConnections: Array<Connection<number, number>> = []
          for (const connection of connectionsForward) {
            if (!outputSet.has(connection[1])) {
              mergedConnections.push(connection)
            }
          }
          for (const connection of connectionsReverse) {
            mergedConnections.push(connection)
          }
          layers = [[], mergedLayers1]
          connections = mergedConnections
        } else {
          layers = layersReverse
          connections = connectionsReverse
        }
      } else {
        throw new Error('target is input substrate or unknown node type')
      }

      const nodes = substrateNodes.get(targetKey) as SubstratePointBucket
      if (layers[1] != null) {
        for (const node of layers[1]) {
          addPointToBucket(nodes, node)
        }
      }

      const linkKey = toLinkKey(sourceKey, targetKey)
      const weight = (genome.links.get(linkKey) as DESHyperNEATLink).weight
      for (const connection of connections) {
        const [fromPointId, toPointId, edge] = connection
        const fromId = getOrCreateNodePointId(sourceKey, fromPointId)
        const toId = getOrCreateNodePointId(targetKey, toPointId)
        assembledConnections.add(fromId, toId, edge * weight, true)
      }
    } else {
      const [nodeKey] = action
      const nodeType = nodeKeyToType(nodeKey)
      const nodeId = nodeKeyToId(nodeKey)

      const depth = genome.getDepth(nodeKey) as number
      if (depth > 0) {
        const cppn = createExecutor(
          createCPPNPhenotype(
            genome.getNodeCPPN(nodeKey) as CPPNGenome<CPPNGenomeOptions>
          )
        )

        let layers: Point[][]
        let connections: Array<Connection<number, number>>
        if (nodeType === NodeType.Input || nodeType === NodeType.Hidden) {
          const points = substrateNodes.get(nodeKey) as SubstratePointBucket
          ;[layers, connections] = exploreSubstrate(
            points.points,
            [],
            cppn,
            depth,
            false,
            false,
            genome.genomeOptions as ESHyperNEATGenomeOptions,
            getOrCreatePointIdFromPoint
          )
        } else if (nodeType === NodeType.Output) {
          ;[layers, connections] = exploreSubstrate(
            outputNodes[nodeId] as Point[],
            [],
            cppn,
            depth,
            true,
            false,
            genome.genomeOptions as ESHyperNEATGenomeOptions,
            getOrCreatePointIdFromPoint
          )
        } else {
          throw new Error('Unknown node type')
        }

        const nodes = substrateNodes.get(nodeKey) as SubstratePointBucket
        for (let i = 1; i < layers.length; i++) {
          const layer = layers[i] as Point[]
          for (const node of layer) {
            addPointToBucket(nodes, node)
          }
        }
        for (const connection of connections) {
          const [fromPointId, toPointId, edge] = connection
          const fromId = getOrCreateNodePointId(nodeKey, fromPointId)
          const toId = getOrCreateNodePointId(nodeKey, toPointId)
          assembledConnections.add(fromId, toId, edge, true)
        }
      }
    }
  }

  const flattenedInputs = new Set<NodePointId>()
  for (const id of flattenedInputIds) {
    flattenedInputs.add(id)
  }
  const flattenedOutputs = new Set<NodePointId>()
  for (const id of flattenedOutputIds) {
    flattenedOutputs.add(id)
  }

  // Remove any node not on a path between input and output nodes
  const pruned = assembledConnections.prune(
    flattenedInputs,
    flattenedOutputs,
    true
  )

  // Collect all hidden nodes, in all hidden substrates and I/O substrates
  const hiddenNodeIds: number[] = []
  for (const [nodeKey, node] of genome.hiddenNodes.entries()) {
    const points = substrateNodes.get(nodeKey) as SubstratePointBucket
    for (const point of points.points) {
      hiddenNodeIds.push(
        getNodePointIdFromPoint(toNodeKey(node.type, node.id), point)
      )
    }
  }
  for (const [nodeKey, node] of genome.inputs.entries()) {
    const points = substrateNodes.get(nodeKey) as SubstratePointBucket
    for (const point of points.points) {
      const nodePointId = getNodePointIdFromPoint(
        toNodeKey(node.type, node.id),
        point
      )
      if (!flattenedInputIds.has(nodePointId)) {
        hiddenNodeIds.push(nodePointId)
      }
    }
  }
  for (const [nodeKey, node] of genome.outputs.entries()) {
    const points = substrateNodes.get(nodeKey) as SubstratePointBucket
    for (const point of points.points) {
      const nodePointId = getNodePointIdFromPoint(
        toNodeKey(node.type, node.id),
        point
      )
      if (!flattenedOutputIds.has(nodePointId)) {
        hiddenNodeIds.push(nodePointId)
      }
    }
  }

  const flattenedHiddenNodes: NodePointId[] = []
  for (const nodeId of hiddenNodeIds) {
    if (!pruned.has(nodeId)) {
      flattenedHiddenNodes.push(nodeId)
    }
  }

  const nodes = [
    ...flattenedInputs,
    ...flattenedHiddenNodes,
    ...flattenedOutputs,
  ]

  const firstOutputId = nodes.length - flattenedInputs.size + 1
  const inputs = Array.from({ length: flattenedInputs.size }, (_, i) => i)
  const outputs = Array.from(
    { length: flattenedOutputs.size },
    (_, i) => i + firstOutputId
  )

  const nodeMapping = new Map<NodePointId, number>()
  for (let i = 0; i < nodes.length; i++) {
    nodeMapping.set(nodes[i] as NodePointId, i)
  }

  // Map topologically sorted order to neural network actions.
  const actions: PhenotypeAction[] = []
  for (const action of assembledConnections.sortTopologically()) {
    if (isActionEdge(action)) {
      const [from, to, weight] = action
      actions.push([
        PhenotypeActionType.Link,
        nodeMapping.get(from) as number,
        nodeMapping.get(to) as number,
        weight,
      ])
    } else {
      const [nodeKey] = action
      const index = nodeMapping.get(nodeKey) as number
      actions.push([
        PhenotypeActionType.Activation,
        index,
        0.0,
        index < firstOutputId
          ? genome.genomeOptions.hiddenActivation
          : genome.genomeOptions.outputActivation,
      ])
    }
  }

  return {
    length: nodeMapping.size,
    inputs,
    outputs,
    actions,
  }
}
