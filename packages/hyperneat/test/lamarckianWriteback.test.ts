import {
  Activation,
  type Phenotype,
  type PhenotypeAction,
  PhenotypeActionType,
  type WritebackPayload,
} from '@neat-evolution/core'
import { createTrainableExecutor } from '@neat-evolution/executor'
import { describe, expect, it } from 'vitest'

/**
 * Build a minimal CPPN phenotype for testing.
 * 4 inputs (x0, y0, x1, y1) → hidden → 2 outputs (weight, bias)
 */
function makeCPPNPhenotype(config: {
  hiddenCount: number
  links: Array<[from: number, to: number, weight: number]>
  hiddenActivation?: Activation
  biases?: Record<number, number>
}): Phenotype {
  const inputCount = 4
  const outputCount = 2
  const {
    hiddenCount,
    links,
    hiddenActivation = Activation.Tanh,
    biases = {},
  } = config
  const totalNodes = inputCount + hiddenCount + outputCount

  const inputNodes = Array.from({ length: inputCount }, (_, i) => i)
  const outputNodes = Array.from(
    { length: outputCount },
    (_, i) => inputCount + hiddenCount + i
  )

  const linksByTarget = new Map<number, typeof links>()
  for (const link of links) {
    const to = link[1]
    if (!linksByTarget.has(to)) {
      linksByTarget.set(to, [])
    }
    linksByTarget.get(to)?.push(link)
  }

  const actions: PhenotypeAction[] = []
  for (let node = inputCount; node < totalNodes; node++) {
    const nodeLinks = linksByTarget.get(node) ?? []
    for (const [from, to, weight] of nodeLinks) {
      actions.push([PhenotypeActionType.Link, from, to, weight])
    }
    const isOutput = node >= inputCount + hiddenCount
    actions.push([
      PhenotypeActionType.Activation,
      node,
      biases[node] ?? 0,
      isOutput ? Activation.Linear : hiddenActivation,
    ])
  }

  return {
    length: totalNodes,
    inputs: inputNodes,
    outputs: outputNodes,
    actions,
  }
}

/**
 * Build a substrate phenotype from a CPPN, capturing coordinate metadata
 * and setting closures — mimicking what HyperNEAT's createPhenotype does.
 */
function buildSubstrateWithClosures(
  cppnPhenotype: Phenotype,
  linkCoords: Array<{
    from: number
    to: number
    x0: number
    y0: number
    x1: number
    y1: number
  }>,
  nodeCoords: Array<{
    node: number
    x: number
    y: number
  }>,
  config: {
    inputCount: number
    hiddenCount: number
    outputCount: number
    hiddenActivation: Activation
    outputActivation: Activation
  }
): Phenotype {
  const {
    inputCount,
    hiddenCount,
    outputCount,
    hiddenActivation,
    outputActivation,
  } = config
  const totalNodes = inputCount + hiddenCount + outputCount
  const cppnExec = createTrainableExecutor(cppnPhenotype)

  // Group link coords by target for topological ordering
  const linksByTarget = new Map<number, (typeof linkCoords)[number][]>()
  for (const lc of linkCoords) {
    if (!linksByTarget.has(lc.to)) {
      linksByTarget.set(lc.to, [])
    }
    linksByTarget.get(lc.to)?.push(lc)
  }

  const nodeCoordMap = new Map<number, (typeof nodeCoords)[number]>()
  for (const nc of nodeCoords) {
    nodeCoordMap.set(nc.node, nc)
  }

  const actions: PhenotypeAction[] = []
  const resultLinkCoords: Array<{
    actionIndex: number
    x0: number
    y0: number
    x1: number
    y1: number
  }> = []
  const resultNodeCoords: Array<{
    actionIndex: number
    x: number
    y: number
  }> = []
  let actionIndex = 0

  for (let node = inputCount; node < totalNodes; node++) {
    // Links into this node
    const nodeLinkCoords = linksByTarget.get(node) ?? []
    for (const lc of nodeLinkCoords) {
      const cppnOut = cppnExec.forward([lc.x0, lc.y0, lc.x1, lc.y1])
      const weight = cppnOut[0] as number
      resultLinkCoords.push({
        actionIndex,
        x0: lc.x0,
        y0: lc.y0,
        x1: lc.x1,
        y1: lc.y1,
      })
      actions.push([PhenotypeActionType.Link, lc.from, lc.to, weight])
      actionIndex++
    }

    // Activation for this node
    const nc = nodeCoordMap.get(node)
    let bias = 0
    if (nc !== undefined) {
      const cppnOut = cppnExec.forward([0.0, 0.0, nc.x, nc.y])
      bias = cppnOut[1] as number
      resultNodeCoords.push({ actionIndex, x: nc.x, y: nc.y })
    }
    const isOutput = node >= inputCount + hiddenCount
    const activation = isOutput ? outputActivation : hiddenActivation
    actions.push([PhenotypeActionType.Activation, node, bias, activation])
    actionIndex++
  }

  // Set up closures (same pattern as real createPhenotype)
  let cppnTrainableExecutor:
    | ReturnType<typeof createTrainableExecutor>
    | undefined

  const result: Phenotype = {
    length: totalNodes,
    inputs: Array.from({ length: inputCount }, (_, i) => i),
    outputs: Array.from(
      { length: outputCount },
      (_, i) => inputCount + hiddenCount + i
    ),
    actions,
    coordinateMap: {
      linkCoords: resultLinkCoords,
      nodeCoords: resultNodeCoords,
      cppnPhenotype,
    },
  }

  const coordinateCount = resultLinkCoords.length + resultNodeCoords.length
  const cppnLrScale = coordinateCount > 0 ? 1 / coordinateCount : 1

  // Pre-allocate error buffers for CPPN backward (avoid per-coordinate allocation)
  const linkError = new Float64Array(2) // [grad, 0] for weight output
  const nodeError = new Float64Array(2) // [0, grad] for bias output

  result.chainBackward = (gradients: Float64Array, lr: number): void => {
    if (cppnTrainableExecutor === undefined) {
      cppnTrainableExecutor = createTrainableExecutor(cppnPhenotype)
    }
    cppnTrainableExecutor.zeroGradients()
    for (const lc of resultLinkCoords) {
      const grad = gradients[lc.actionIndex]
      if (grad === undefined || grad === 0) continue
      cppnTrainableExecutor.forward([lc.x0, lc.y0, lc.x1, lc.y1])
      linkError[0] = grad
      cppnTrainableExecutor.accumulateBackward(linkError)
    }
    for (const nc of resultNodeCoords) {
      const grad = gradients[nc.actionIndex]
      if (grad === undefined || grad === 0) continue
      cppnTrainableExecutor.forward([0.0, 0.0, nc.x, nc.y])
      nodeError[1] = grad
      cppnTrainableExecutor.accumulateBackward(nodeError)
    }
    cppnTrainableExecutor.applyGradients(lr * cppnLrScale)
  }

  result.transformWriteback = (): WritebackPayload | undefined => {
    if (cppnTrainableExecutor === undefined) return undefined
    return cppnTrainableExecutor.getUpdatedActions()
  }

  return result
}

describe('HyperNEAT Lamarckian writeback', () => {
  // Shared CPPN and substrate geometry
  const cppnPhenotype = makeCPPNPhenotype({
    hiddenCount: 4,
    links: [
      // input → hidden
      [0, 4, 0.3],
      [1, 4, -0.2],
      [2, 4, 0.4],
      [3, 4, 0.1],
      [0, 5, -0.1],
      [1, 5, 0.3],
      [2, 5, -0.2],
      [3, 5, 0.4],
      [0, 6, 0.2],
      [1, 6, 0.1],
      [2, 6, -0.3],
      [3, 6, 0.2],
      [0, 7, -0.3],
      [1, 7, 0.2],
      [2, 7, 0.1],
      [3, 7, -0.2],
      // hidden → output
      [4, 8, 0.5],
      [5, 8, -0.3],
      [6, 8, 0.4],
      [7, 8, -0.2],
      [4, 9, -0.2],
      [5, 9, 0.4],
      [6, 9, -0.1],
      [7, 9, 0.3],
    ],
  })

  // Substrate: 2 inputs → 2 hidden → 1 output
  const linkCoords = [
    { from: 0, to: 2, x0: -1, y0: -1, x1: 0, y1: 0 },
    { from: 1, to: 2, x0: 1, y0: -1, x1: 0, y1: 0 },
    { from: 0, to: 3, x0: -1, y0: -1, x1: 0, y1: 0.5 },
    { from: 1, to: 3, x0: 1, y0: -1, x1: 0, y1: 0.5 },
    { from: 2, to: 4, x0: 0, y0: 0, x1: 0, y1: 1 },
    { from: 3, to: 4, x0: 0, y0: 0.5, x1: 0, y1: 1 },
  ]

  const nodeCoords = [
    { node: 2, x: 0, y: 0 },
    { node: 3, x: 0, y: 0.5 },
    { node: 4, x: 0, y: 1 },
  ]

  const substrateConfig = {
    inputCount: 2,
    hiddenCount: 2,
    outputCount: 1,
    hiddenActivation: Activation.Tanh,
    outputActivation: Activation.Sigmoid,
  }

  it('should produce a phenotype with coordinate map and closures', () => {
    const phenotype = buildSubstrateWithClosures(
      cppnPhenotype,
      linkCoords,
      nodeCoords,
      substrateConfig
    )

    expect(phenotype.coordinateMap).toBeDefined()
    const map = phenotype.coordinateMap
    if (map === undefined) throw new Error('unreachable')
    expect(map.linkCoords.length).toBe(6)
    expect(map.nodeCoords.length).toBe(3)
    expect(map.cppnPhenotype).toBe(cppnPhenotype)
    expect(phenotype.chainBackward).toBeTypeOf('function')
    expect(phenotype.transformWriteback).toBeTypeOf('function')
  })

  it('should return undefined from transformWriteback when no backward called', () => {
    const phenotype = buildSubstrateWithClosures(
      cppnPhenotype,
      linkCoords,
      nodeCoords,
      substrateConfig
    )

    if (phenotype.transformWriteback === undefined)
      throw new Error('unreachable')
    expect(phenotype.transformWriteback()).toBeUndefined()
  })

  it('should return CPPN actions from getUpdatedActions after training', () => {
    const phenotype = buildSubstrateWithClosures(
      cppnPhenotype,
      linkCoords,
      nodeCoords,
      substrateConfig
    )

    const executor = createTrainableExecutor(phenotype)

    // Train on AND gate
    const andData = [
      { input: [0, 0], target: 0 },
      { input: [0, 1], target: 0 },
      { input: [1, 0], target: 0 },
      { input: [1, 1], target: 1 },
    ]

    for (let epoch = 0; epoch < 100; epoch++) {
      for (const { input, target } of andData) {
        const out = executor.forward(input)
        const error = (out[0] as number) - target
        executor.backward(new Float64Array([error]), 0.5)
      }
    }

    // getUpdatedActions should return CPPN-shaped actions (via transformWriteback)
    const payload = executor.getUpdatedActions()

    // CPPN has more actions than the substrate (4 hidden nodes, 2 outputs, etc.)
    // The key check: these should be CPPN actions, not substrate actions
    expect(payload.actions.length).toBe(cppnPhenotype.actions.length)
  })

  it('should change CPPN weights after substrate training via chainBackward', () => {
    const phenotype = buildSubstrateWithClosures(
      cppnPhenotype,
      linkCoords,
      nodeCoords,
      substrateConfig
    )

    const executor = createTrainableExecutor(phenotype)

    // Get original CPPN actions (via a fresh executor)
    const originalCPPN = createTrainableExecutor(cppnPhenotype)
    const originalActions = originalCPPN.getUpdatedActions()
    // Note: originalActions is a WritebackPayload

    // Train substrate (chains to CPPN)
    const andData = [
      { input: [0, 0], target: 0 },
      { input: [0, 1], target: 0 },
      { input: [1, 0], target: 0 },
      { input: [1, 1], target: 1 },
    ]

    for (let epoch = 0; epoch < 200; epoch++) {
      for (const { input, target } of andData) {
        const out = executor.forward(input)
        const error = (out[0] as number) - target
        executor.backward(new Float64Array([error]), 0.01)
      }
    }

    // Get trained CPPN actions (via transformWriteback)
    const trainedPayload = executor.getUpdatedActions()

    // CPPN weights should have changed
    let someWeightChanged = false
    for (let i = 0; i < originalActions.actions.length; i++) {
      const orig = originalActions.actions[i]
      const trained = trainedPayload.actions[i]
      if (orig === undefined || trained === undefined) continue
      if (
        orig[0] === PhenotypeActionType.Link &&
        trained[0] === PhenotypeActionType.Link
      ) {
        if (Math.abs((orig[3] as number) - (trained[3] as number)) > 1e-10) {
          someWeightChanged = true
          break
        }
      }
    }
    expect(someWeightChanged).toBe(true)
  })

  it('should improve substrate performance through Lamarckian round-trip', () => {
    // Use a simpler substrate: 1 input → 1 output (linear)
    // This isolates the round-trip mechanism from capacity/lr tuning issues
    const simpleCPPN = makeCPPNPhenotype({
      hiddenCount: 3,
      links: [
        [0, 4, 0.3],
        [1, 4, -0.2],
        [2, 4, 0.4],
        [3, 4, 0.1],
        [0, 5, -0.1],
        [1, 5, 0.3],
        [2, 5, -0.2],
        [3, 5, 0.4],
        [0, 6, 0.2],
        [1, 6, 0.1],
        [2, 6, -0.3],
        [3, 6, 0.2],
        [4, 7, 0.5],
        [5, 7, -0.3],
        [6, 7, 0.4],
        [4, 8, -0.2],
        [5, 8, 0.4],
        [6, 8, -0.1],
      ],
    })

    // Minimal substrate: 1 input → 1 output, 1 link
    const simpleLinkCoords = [{ from: 0, to: 1, x0: 0, y0: -1, x1: 0, y1: 1 }]
    const simpleNodeCoords = [{ node: 1, x: 0, y: 1 }]
    const simpleConfig = {
      inputCount: 1,
      hiddenCount: 0,
      outputCount: 1,
      hiddenActivation: Activation.Linear,
      outputActivation: Activation.Linear,
    }

    // Build initial substrate
    const phenotype1 = buildSubstrateWithClosures(
      simpleCPPN,
      simpleLinkCoords,
      simpleNodeCoords,
      simpleConfig
    )

    // Train: learn f(x) = 2x
    const executor = createTrainableExecutor(phenotype1)
    const samples = [
      { input: [1.0], target: 2.0 },
      { input: [2.0], target: 4.0 },
      { input: [-1.0], target: -2.0 },
    ]

    // Measure initial loss
    let initialLoss = 0
    for (const { input, target } of samples) {
      const out = executor.forward(input)
      const diff = (out[0] as number) - target
      initialLoss += diff * diff
    }

    // Train substrate (chains to CPPN via scaled lr)
    for (let epoch = 0; epoch < 500; epoch++) {
      for (const { input, target } of samples) {
        const out = executor.forward(input)
        const error = (out[0] as number) - target
        executor.backward(new Float64Array([error]), 0.01)
      }
    }

    // Get trained CPPN actions and rebuild substrate
    const cppnPayload = executor.getUpdatedActions()
    const trainedCPPNPhenotype: Phenotype = {
      ...simpleCPPN,
      actions: cppnPayload.actions,
    }

    const phenotype2 = buildSubstrateWithClosures(
      trainedCPPNPhenotype,
      simpleLinkCoords,
      simpleNodeCoords,
      simpleConfig
    )

    // Measure rebuilt substrate's performance
    const rebuiltExecutor = createTrainableExecutor(phenotype2)
    let rebuiltLoss = 0
    for (const { input, target } of samples) {
      const out = rebuiltExecutor.forward(input)
      const diff = (out[0] as number) - target
      rebuiltLoss += diff * diff
    }

    // The rebuilt substrate should start closer to the solution
    expect(rebuiltLoss).toBeLessThan(initialLoss)
  })
})
