import {
  Activation,
  type Phenotype,
  type PhenotypeAction,
  PhenotypeActionType,
} from '@neat-evolution/core'
import { describe, expect, it } from 'vitest'

import { createTrainableExecutor } from '../../../src/features/backprop/createTrainableExecutor.js'

/**
 * Proof of concept: two-phase Lamarckian backprop for HyperNEAT.
 *
 * Phase 1: Train the substrate phenotype on a task (backprop on the deployed network).
 * Phase 2: Distill the trained weights back into the CPPN (backprop on the weight generator).
 *
 * Both phases use the same createTrainableExecutor — the CPPN is just another phenotype.
 */

// --- Substrate coordinate metadata ---

interface SubstrateLinkCoord {
  from: number
  to: number
  x0: number
  y0: number
  x1: number
  y1: number
}

interface SubstrateNodeCoord {
  node: number
  x: number
  y: number
}

// --- Helpers ---

function makeCPPNPhenotype(config: {
  hiddenCount: number
  links: Array<[from: number, to: number, weight: number]>
  hiddenActivation?: Activation
  biases?: Record<number, number>
}): Phenotype {
  // CPPN: 4 inputs (x0, y0, x1, y1) → hidden → 2 outputs (weight, bias)
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

function buildSubstrateFromCPPN(
  cppnForward: (inputs: number[] | Float64Array) => Float64Array,
  linkCoords: SubstrateLinkCoord[],
  nodeCoords: SubstrateNodeCoord[],
  config: {
    inputCount: number
    hiddenCount: number
    outputCount: number
    hiddenActivation: Activation
    outputActivation: Activation
    weightThreshold?: number
  }
): {
  phenotype: Phenotype
  generatedWeights: number[]
  generatedBiases: number[]
} {
  const {
    inputCount,
    hiddenCount,
    outputCount,
    hiddenActivation,
    outputActivation,
    weightThreshold = 0,
  } = config

  const totalNodes = inputCount + hiddenCount + outputCount
  const inputNodes = Array.from({ length: inputCount }, (_, i) => i)
  const outputNodes = Array.from(
    { length: outputCount },
    (_, i) => inputCount + hiddenCount + i
  )

  // Group link coords by target node for topological ordering
  const linksByTarget = new Map<number, SubstrateLinkCoord[]>()
  for (const lc of linkCoords) {
    if (!linksByTarget.has(lc.to)) {
      linksByTarget.set(lc.to, [])
    }
    linksByTarget.get(lc.to)?.push(lc)
  }

  // Build node coord lookup
  const nodeCoordMap = new Map<number, SubstrateNodeCoord>()
  for (const nc of nodeCoords) {
    nodeCoordMap.set(nc.node, nc)
  }

  const actions: PhenotypeAction[] = []
  const generatedWeights: number[] = []
  const generatedBiases: number[] = []

  for (let node = inputCount; node < totalNodes; node++) {
    // Links into this node
    const nodeLinkCoords = linksByTarget.get(node) ?? []
    for (const lc of nodeLinkCoords) {
      const cppnOut = cppnForward([lc.x0, lc.y0, lc.x1, lc.y1])
      const weight = cppnOut[0] as number
      generatedWeights.push(weight)
      if (Math.abs(weight) > weightThreshold) {
        actions.push([PhenotypeActionType.Link, lc.from, lc.to, weight])
      }
    }

    // Activation for this node
    const nc = nodeCoordMap.get(node)
    let bias = 0
    if (nc) {
      const cppnOut = cppnForward([0.0, 0.0, nc.x, nc.y])
      bias = cppnOut[1] as number
    }
    generatedBiases.push(bias)

    const isOutput = node >= inputCount + hiddenCount
    const activation = isOutput ? outputActivation : hiddenActivation
    actions.push([PhenotypeActionType.Activation, node, bias, activation])
  }

  return {
    phenotype: {
      length: totalNodes,
      inputs: inputNodes,
      outputs: outputNodes,
      actions,
    },
    generatedWeights,
    generatedBiases,
  }
}

// --- Tests ---

describe('CPPN distillation proof of concept', () => {
  it('should train a CPPN to generate specific target weights', () => {
    // A CPPN that maps coordinates → [weight, bias]
    // 4 inputs → 3 hidden (Tanh) → 2 outputs (Linear)
    // Nodes: 0-3=inputs, 4-6=hidden, 7-8=outputs
    const cppnPhenotype = makeCPPNPhenotype({
      hiddenCount: 3,
      links: [
        // input → hidden (fully connected)
        [0, 4, 0.1],
        [1, 4, 0.2],
        [2, 4, -0.1],
        [3, 4, 0.15],
        [0, 5, -0.2],
        [1, 5, 0.1],
        [2, 5, 0.3],
        [3, 5, -0.1],
        [0, 6, 0.15],
        [1, 6, -0.15],
        [2, 6, 0.1],
        [3, 6, 0.2],
        // hidden → output
        [4, 7, 0.3],
        [5, 7, -0.2],
        [6, 7, 0.4],
        [4, 8, -0.1],
        [5, 8, 0.3],
        [6, 8, 0.2],
      ],
    })

    const cppn = createTrainableExecutor(cppnPhenotype)

    // Training data: coordinate → target weight (output[0])
    const trainingData = [
      { input: [0, 0, 0.5, 0.5], targetWeight: 1.5 },
      { input: [1, 0, 0.5, 0.5], targetWeight: -0.8 },
      { input: [0, 0, 0.5, -0.5], targetWeight: 0.3 },
      { input: [1, 0, 0.5, -0.5], targetWeight: -1.2 },
      { input: [0.5, 0.5, 1, 0], targetWeight: 2.0 },
      { input: [0.5, -0.5, 1, 0], targetWeight: -1.0 },
    ]

    // Track initial error
    let initialMSE = 0
    for (const { input, targetWeight } of trainingData) {
      const out = cppn.forward(input)
      const diff = (out[0] as number) - targetWeight
      initialMSE += diff * diff
    }
    initialMSE /= trainingData.length

    // Train the CPPN
    const lr = 0.01
    for (let epoch = 0; epoch < 500; epoch++) {
      for (const { input, targetWeight } of trainingData) {
        const out = cppn.forward(input)
        const weightError = (out[0] as number) - targetWeight
        // Only train weight output (index 0), leave bias output (index 1) alone
        cppn.backward(new Float64Array([weightError, 0]), lr)
      }
    }

    // Check that the CPPN now generates weights closer to targets
    let finalMSE = 0
    for (const { input, targetWeight } of trainingData) {
      const out = cppn.forward(input)
      const diff = (out[0] as number) - targetWeight
      finalMSE += diff * diff
    }
    finalMSE /= trainingData.length

    expect(finalMSE).toBeLessThan(initialMSE * 0.1) // At least 10x improvement
  })

  it('should demonstrate the full two-phase HyperNEAT Lamarckian loop', () => {
    // === Setup: define substrate geometry ===

    // Substrate: 2 inputs → 2 hidden → 1 output
    // Nodes: 0,1=inputs, 2,3=hidden, 4=output
    const linkCoords: SubstrateLinkCoord[] = [
      { from: 0, to: 2, x0: -1, y0: -1, x1: 0, y1: 0 },
      { from: 1, to: 2, x0: 1, y0: -1, x1: 0, y1: 0 },
      { from: 0, to: 3, x0: -1, y0: -1, x1: 0, y1: 0.5 },
      { from: 1, to: 3, x0: 1, y0: -1, x1: 0, y1: 0.5 },
      { from: 2, to: 4, x0: 0, y0: 0, x1: 0, y1: 1 },
      { from: 3, to: 4, x0: 0, y0: 0.5, x1: 0, y1: 1 },
    ]

    const nodeCoords: SubstrateNodeCoord[] = [
      { node: 2, x: 0, y: 0 },
      { node: 3, x: 0, y: 0.5 },
      { node: 4, x: 0, y: 1 },
    ]

    // === Phase 0: Create CPPN and build initial substrate ===

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

    const cppnExecutor = createTrainableExecutor(cppnPhenotype)

    const substrateConfig = {
      inputCount: 2,
      hiddenCount: 2,
      outputCount: 1,
      hiddenActivation: Activation.Tanh,
      outputActivation: Activation.Sigmoid,
    }

    const { phenotype: initialSubstrate } = buildSubstrateFromCPPN(
      (inputs) => cppnExecutor.forward(inputs),
      linkCoords,
      nodeCoords,
      substrateConfig
    )

    // === Phase 1: Train substrate on AND gate ===

    const substrateExecutor = createTrainableExecutor(initialSubstrate)

    const andData = [
      { input: [0, 0], target: 0 },
      { input: [0, 1], target: 0 },
      { input: [1, 0], target: 0 },
      { input: [1, 1], target: 1 },
    ]

    // Measure initial substrate performance
    let initialLoss = 0
    for (const { input, target } of andData) {
      const out = substrateExecutor.forward(input)
      const diff = (out[0] as number) - target
      initialLoss += diff * diff
    }

    // Train substrate
    for (let epoch = 0; epoch < 1000; epoch++) {
      for (const { input, target } of andData) {
        const out = substrateExecutor.forward(input)
        const error = (out[0] as number) - target
        substrateExecutor.backward(new Float64Array([error]), 0.5)
      }
    }

    // Measure trained substrate performance
    let trainedLoss = 0
    for (const { input, target } of andData) {
      const out = substrateExecutor.forward(input)
      const diff = (out[0] as number) - target
      trainedLoss += diff * diff
    }
    expect(trainedLoss).toBeLessThan(initialLoss)

    // === Extract trained weights and biases from substrate ===

    const { actions: trainedActions } = substrateExecutor.getUpdatedActions()
    const trainedWeights: Array<{ coords: number[]; weight: number }> = []
    const trainedBiases: Array<{ coords: number[]; bias: number }> = []

    let linkIdx = 0
    let nodeIdx = 0
    for (const action of trainedActions) {
      if (action[0] === PhenotypeActionType.Link) {
        const lc = linkCoords[linkIdx] as (typeof linkCoords)[number]
        trainedWeights.push({
          coords: [lc.x0, lc.y0, lc.x1, lc.y1],
          weight: action[3] as number,
        })
        linkIdx++
      } else {
        const nc = nodeCoords[nodeIdx] as (typeof nodeCoords)[number]
        trainedBiases.push({
          coords: [0.0, 0.0, nc.x, nc.y],
          bias: action[2] as number,
        })
        nodeIdx++
      }
    }

    // === Phase 2: Distill trained weights back into CPPN ===

    // Measure initial CPPN distance from trained weights
    let initialDistillMSE = 0
    for (const { coords, weight } of trainedWeights) {
      const out = cppnExecutor.forward(coords)
      const diff = (out[0] as number) - weight
      initialDistillMSE += diff * diff
    }
    for (const { coords, bias } of trainedBiases) {
      const out = cppnExecutor.forward(coords)
      const diff = (out[1] as number) - bias
      initialDistillMSE += diff * diff
    }

    // Train CPPN to generate the trained substrate weights
    for (let epoch = 0; epoch < 500; epoch++) {
      for (const { coords, weight } of trainedWeights) {
        const out = cppnExecutor.forward(coords)
        const weightError = (out[0] as number) - weight
        cppnExecutor.backward(new Float64Array([weightError, 0]), 0.01)
      }
      for (const { coords, bias } of trainedBiases) {
        const out = cppnExecutor.forward(coords)
        const biasError = (out[1] as number) - bias
        cppnExecutor.backward(new Float64Array([0, biasError]), 0.01)
      }
    }

    // Measure final CPPN distance from trained weights
    let finalDistillMSE = 0
    for (const { coords, weight } of trainedWeights) {
      const out = cppnExecutor.forward(coords)
      const diff = (out[0] as number) - weight
      finalDistillMSE += diff * diff
    }
    for (const { coords, bias } of trainedBiases) {
      const out = cppnExecutor.forward(coords)
      const diff = (out[1] as number) - bias
      finalDistillMSE += diff * diff
    }

    expect(finalDistillMSE).toBeLessThan(initialDistillMSE)

    // === Phase 3: Rebuild substrate from updated CPPN and verify improvement ===

    const { phenotype: distilledSubstrate } = buildSubstrateFromCPPN(
      (inputs) => cppnExecutor.forward(inputs),
      linkCoords,
      nodeCoords,
      substrateConfig
    )

    // The distilled substrate should perform better than the ORIGINAL substrate
    // (before any substrate training), because the CPPN now generates weights
    // closer to the trained values.
    const distilledExecutor = createTrainableExecutor(distilledSubstrate)
    let distilledLoss = 0
    for (const { input, target } of andData) {
      const out = distilledExecutor.forward(input)
      const diff = (out[0] as number) - target
      distilledLoss += diff * diff
    }

    // Distilled substrate starts closer to the solution than the original
    expect(distilledLoss).toBeLessThan(initialLoss)
  })
})
