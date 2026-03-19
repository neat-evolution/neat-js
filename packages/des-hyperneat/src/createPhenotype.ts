import {
  type Connection,
  Connections,
  isActionEdge,
  type LinkCoord,
  type NodeCoord,
  type NodeKey,
  NodeType,
  nodeKeyToId,
  nodeKeyToType,
  type Phenotype,
  type PhenotypeAction,
  PhenotypeActionType,
  type PhenotypeFactory,
  resolveOutputActivation,
  toLinkKey,
  toNodeKey,
  type WritebackPayload,
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
import {
  createExecutor,
  createTrainableExecutor,
  type TrainableExecutor,
} from '@neat-evolution/executor'
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

  const useBias = genome.genomeOptions.useBias === true
  const biasByNodePointId = useBias ? new Map<NodePointId, number>() : undefined

  const pointIdByX = new Map<number, Map<number, number>>()
  const pointById = new Map<number, Point>()
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
    pointById.set(id, [x, y])
    return id
  }
  const getOrCreatePointIdFromPoint = (point: Point): number => {
    return getOrCreatePointId(point[0], point[1])
  }

  const nodePointIndexByNode = new Map<NodeKey, Map<number, number>>()
  const pointIdByNodePointId = new Map<NodePointId, number>()
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
    pointIdByNodePointId.set(id, pointId)
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

  // Provenance tracking for per-sub-CPPN gradient routing
  const subCPPNPhenotypes = new Map<number, Phenotype>()
  let nextSubCPPNKey = 0

  interface ConnectionProv {
    subCPPNKey: number
    sourceType: 'link' | 'node'
    rawOutput: number
    linkWeight?: number
  }
  const connectionProvenance = new Map<string, ConnectionProv>()
  const nodeProvenance = new Map<
    NodePointId,
    { subCPPNKey: number; sourceType: 'link' | 'node'; targetNodeKey?: NodeKey }
  >()

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

      const linkCPPNPhenotype = createCPPNPhenotype(
        genome.getLinkCPPN(
          sourceKey,
          targetKey
        ) as CPPNGenome<CPPNGenomeOptions>
      )
      const subKey = nextSubCPPNKey++
      subCPPNPhenotypes.set(subKey, linkCPPNPhenotype)
      const cppn = createExecutor(linkCPPNPhenotype)

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

      const linkKey = toLinkKey(sourceKey, targetKey)
      const desLink = genome.links.get(linkKey) as DESHyperNEATLink
      const weight = desLink.weight
      const targetGenomeNode = genome.getNodeByKey(targetKey)
      const targetNodeBias =
        useBias && targetGenomeNode != null ? targetGenomeNode.bias : 0

      const nodes = substrateNodes.get(targetKey) as SubstratePointBucket
      if (layers[1] != null) {
        for (const node of layers[1]) {
          const ptId = addPointToBucket(nodes, node)
          const npId = getOrCreateNodePointId(targetKey, ptId)
          nodeProvenance.set(npId, {
            subCPPNKey: subKey,
            sourceType: 'link',
            targetNodeKey: targetKey,
          })
          if (biasByNodePointId != null) {
            const [, subCppnBias] = cppn.forward([
              0.0,
              0.0,
              node[0] / r,
              node[1] / r,
            ]) as [weight: number, bias: number]
            biasByNodePointId.set(npId, subCppnBias + targetNodeBias)
          }
        }
      }
      for (const connection of connections) {
        const [fromPointId, toPointId, edge] = connection
        const fromId = getOrCreateNodePointId(sourceKey, fromPointId)
        const toId = getOrCreateNodePointId(targetKey, toPointId)
        assembledConnections.add(fromId, toId, edge * weight, true)
        connectionProvenance.set(`${fromId}:${toId}`, {
          subCPPNKey: subKey,
          sourceType: 'link',
          rawOutput: edge,
          linkWeight: weight,
        })
      }
    } else {
      const [nodeKey] = action
      const nodeType = nodeKeyToType(nodeKey)
      const nodeId = nodeKeyToId(nodeKey)

      const depth = genome.getDepth(nodeKey) as number
      if (depth > 0) {
        const nodeCPPNPhenotype = createCPPNPhenotype(
          genome.getNodeCPPN(nodeKey) as CPPNGenome<CPPNGenomeOptions>
        )
        const nodeSubKey = nextSubCPPNKey++
        subCPPNPhenotypes.set(nodeSubKey, nodeCPPNPhenotype)
        const cppn = createExecutor(nodeCPPNPhenotype)

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
        const nodeGenomeBias = useBias
          ? (genome.getNodeByKey(nodeKey)?.bias ?? 0)
          : 0
        for (let i = 1; i < layers.length; i++) {
          const layer = layers[i] as Point[]
          for (const node of layer) {
            const ptId = addPointToBucket(nodes, node)
            const npId = getOrCreateNodePointId(nodeKey, ptId)
            nodeProvenance.set(npId, {
              subCPPNKey: nodeSubKey,
              sourceType: 'node',
              targetNodeKey: nodeKey,
            })
            if (biasByNodePointId != null) {
              const [, bias] = cppn.forward([
                0.0,
                0.0,
                node[0] / r,
                node[1] / r,
              ]) as [weight: number, bias: number]
              biasByNodePointId.set(npId, bias + nodeGenomeBias)
            }
          }
        }
        for (const connection of connections) {
          const [fromPointId, toPointId, edge] = connection
          const fromId = getOrCreateNodePointId(nodeKey, fromPointId)
          const toId = getOrCreateNodePointId(nodeKey, toPointId)
          assembledConnections.add(fromId, toId, edge, true)
          connectionProvenance.set(`${fromId}:${toId}`, {
            subCPPNKey: nodeSubKey,
            sourceType: 'node',
            rawOutput: edge,
          })
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

  // Build the top-level CPPN phenotype for gradient chaining
  const cppnPhenotype = createCPPNPhenotype(
    genome as unknown as CPPNGenome<CPPNGenomeOptions>
  )

  // Map topologically sorted order to neural network actions.
  // Track coordinates for CPPN gradient chaining.
  const actions: PhenotypeAction[] = []
  const linkCoords: LinkCoord[] = []
  const nodeCoords: NodeCoord[] = []
  let actionIndex = 0
  const inverseR = 1 / r

  for (const action of assembledConnections.sortTopologically()) {
    if (isActionEdge(action)) {
      const [from, to, weight] = action
      // Look up coordinates from NodePointId → pointId → [x, y]
      const fromPointId = pointIdByNodePointId.get(from)
      const toPointId = pointIdByNodePointId.get(to)
      if (fromPointId !== undefined && toPointId !== undefined) {
        const fromPoint = pointById.get(fromPointId)
        const toPoint = pointById.get(toPointId)
        if (fromPoint !== undefined && toPoint !== undefined) {
          const prov = connectionProvenance.get(`${from}:${to}`)
          const coord: LinkCoord = {
            actionIndex,
            x0: fromPoint[0] * inverseR,
            y0: fromPoint[1] * inverseR,
            x1: toPoint[0] * inverseR,
            y1: toPoint[1] * inverseR,
          }
          if (prov != null) {
            coord.sourceKey = prov.subCPPNKey
            coord.sourceType = prov.sourceType
            coord.subCPPNOutput = prov.rawOutput
            if (prov.linkWeight !== undefined) {
              coord.linkWeight = prov.linkWeight
            }
          }
          linkCoords.push(coord)
        }
      }
      actions.push([
        PhenotypeActionType.Link,
        nodeMapping.get(from) as number,
        nodeMapping.get(to) as number,
        weight,
      ])
      actionIndex++
    } else {
      const [nodeKey] = action
      const index = nodeMapping.get(nodeKey) as number
      // Look up coordinate for bias chaining
      const pointId = pointIdByNodePointId.get(nodeKey)
      if (pointId !== undefined) {
        const point = pointById.get(pointId)
        if (point !== undefined) {
          const nodeProv = nodeProvenance.get(nodeKey)
          const coord: NodeCoord = {
            actionIndex,
            x: point[0] * inverseR,
            y: point[1] * inverseR,
          }
          if (nodeProv != null) {
            coord.sourceKey = nodeProv.subCPPNKey
            coord.sourceType = nodeProv.sourceType
            if (nodeProv.targetNodeKey !== undefined) {
              coord.targetNodeKey = nodeProv.targetNodeKey
            }
          }
          nodeCoords.push(coord)
        }
      }
      // Bias comes from sub-CPPN + node.bias (composed during assembly)
      actions.push([
        PhenotypeActionType.Activation,
        index,
        biasByNodePointId?.get(nodeKey) ?? 0.0,
        index < firstOutputId
          ? genome.genomeOptions.hiddenActivation
          : resolveOutputActivation(
              genome.genomeOptions.outputActivation,
              index - firstOutputId
            ),
      ])
      actionIndex++
    }
  }

  // Lazy CPPN TrainableExecutor — only created on first backward call, cached for reuse
  let cppnTrainableExecutor: TrainableExecutor | undefined

  // Per-sub-CPPN trainable executors, lazily created on first backward call
  const subCPPNExecutors = new Map<number, TrainableExecutor>()
  const getSubCPPNExecutor = (key: number): TrainableExecutor => {
    let exec = subCPPNExecutors.get(key)
    if (exec === undefined) {
      const phenotype = subCPPNPhenotypes.get(key)
      if (phenotype === undefined) {
        throw new Error(`Sub-CPPN phenotype not found for key ${key}`)
      }
      exec = createTrainableExecutor(phenotype)
      subCPPNExecutors.set(key, exec)
    }
    return exec
  }

  // Gradient averaging: divide lr by total coordinate count (all sub-CPPNs combined)
  const coordinateCount = linkCoords.length + nodeCoords.length
  const cppnLrScale = coordinateCount > 0 ? 1 / coordinateCount : 1
  const baseCppnLr = genome.genomeOptions.cppnLearningRate

  const result: Phenotype = {
    length: nodeMapping.size,
    inputs,
    outputs,
    actions,
    trainableBiases: useBias,
    coordinateMap: { linkCoords, nodeCoords, cppnPhenotype },
  }

  // Pre-allocate error buffers for CPPN backward (avoid per-coordinate allocation)
  const linkError = new Float64Array(2) // [grad, 0] for weight output
  const nodeError = new Float64Array(2) // [0, grad] for bias output

  result.chainBackward = (gradients: Float64Array, lr: number): void => {
    // Top-level CPPN training
    if (cppnTrainableExecutor === undefined) {
      cppnTrainableExecutor = createTrainableExecutor(cppnPhenotype)
    }
    cppnTrainableExecutor.zeroGradients()

    // Zero all active sub-CPPN executors
    for (const exec of subCPPNExecutors.values()) {
      exec.zeroGradients()
    }

    // Track which sub-CPPNs received gradients this step
    const activeSubCPPNs = new Set<number>()

    // Route link gradients to the appropriate sub-CPPN
    for (const lc of linkCoords) {
      const grad = gradients[lc.actionIndex]
      if (grad === undefined || grad === 0) continue

      // Top-level CPPN still gets all gradients
      cppnTrainableExecutor.forward([lc.x0, lc.y0, lc.x1, lc.y1])
      linkError[0] = grad
      cppnTrainableExecutor.accumulateBackward(linkError)

      // Route to sub-CPPN if provenance is available
      if (lc.sourceKey !== undefined && lc.sourceType !== undefined) {
        const subExec = getSubCPPNExecutor(lc.sourceKey)
        activeSubCPPNs.add(lc.sourceKey)
        subExec.forward([lc.x0, lc.y0, lc.x1, lc.y1])
        // Chain rule: link CPPNs get grad * linkWeight
        const subGrad =
          lc.linkWeight !== undefined ? grad * lc.linkWeight : grad
        linkError[0] = subGrad
        subExec.accumulateBackward(linkError)
      }
    }

    // Route node/bias gradients to sub-CPPNs and accumulate node bias deltas.
    // The top-level topology CPPN has no bias output channel — bias gradients
    // go to sub-CPPNs (fine-grained) and node.bias (per-node).
    const nodeBiasGradients = new Map<NodeKey, number>()

    for (const nc of nodeCoords) {
      const grad = gradients[nc.actionIndex]
      if (grad === undefined || grad === 0) continue

      // Sub-CPPN receives bias gradient (additive composition → passes through)
      if (nc.sourceKey !== undefined) {
        const subExec = getSubCPPNExecutor(nc.sourceKey)
        activeSubCPPNs.add(nc.sourceKey)
        subExec.forward([0.0, 0.0, nc.x, nc.y])
        nodeError[1] = grad
        subExec.accumulateBackward(nodeError)
      }

      // Accumulate node bias gradient for the target genome node
      if (nc.targetNodeKey !== undefined) {
        const prev = nodeBiasGradients.get(nc.targetNodeKey) ?? 0
        nodeBiasGradients.set(nc.targetNodeKey, prev + grad)
      }
    }

    // Apply gradients: top-level + all active sub-CPPNs
    const scaledLr = (baseCppnLr ?? lr) * cppnLrScale
    cppnTrainableExecutor.applyGradients(scaledLr)
    for (const key of activeSubCPPNs) {
      const exec = subCPPNExecutors.get(key)
      if (exec !== undefined) {
        exec.applyGradients(scaledLr)
      }
    }

    // Scale node bias gradients and store for writeback
    // The deltas are negative (gradient descent: node.bias -= lr * grad)
    lastNodeBiasDeltas = []
    for (const [nodeKey, grad] of nodeBiasGradients) {
      lastNodeBiasDeltas.push([nodeKey, -scaledLr * grad])
    }
  }

  // Persistent node bias delta accumulator for transformWriteback
  let lastNodeBiasDeltas: Array<[nodeKey: number, delta: number]> = []

  result.transformWriteback = (): WritebackPayload | undefined => {
    if (cppnTrainableExecutor === undefined) return undefined
    const topLevel = cppnTrainableExecutor.getUpdatedActions()

    // Collect per-sub-CPPN writebacks
    const auxiliary: Array<[key: number, actions: PhenotypeAction[]]> = []
    for (const [key, exec] of subCPPNExecutors) {
      auxiliary.push([key, exec.getUpdatedActions().actions])
    }

    const payload: WritebackPayload = { actions: topLevel.actions }
    if (auxiliary.length > 0) {
      payload.auxiliary = auxiliary
    }
    if (lastNodeBiasDeltas.length > 0) {
      payload.nodeBiasDeltas = lastNodeBiasDeltas
    }
    return payload
  }

  return result
}
