import {
  Activation,
  type Phenotype,
  PhenotypeActionType,
} from '@neat-evolution/core'
import { describe, expect, it } from 'vitest'

import { createTrainableExecutor } from '../src/createTrainableExecutor.js'

/**
 * Helper: build a simple phenotype from a description.
 *
 * Layout:
 *   nodes 0..inputCount-1 = inputs
 *   nodes inputCount..inputCount+hiddenCount-1 = hidden
 *   nodes inputCount+hiddenCount.. = outputs
 */
function makePhenotype(config: {
  inputs: number
  hiddenCount: number
  outputs: number
  links: Array<[from: number, to: number, weight: number]>
  hiddenActivation?: Activation
  outputActivation?: Activation
  biases?: Record<number, number>
}): Phenotype {
  const {
    inputs: inputCount,
    hiddenCount,
    outputs: outputCount,
    links,
    hiddenActivation = Activation.Sigmoid,
    outputActivation = Activation.Sigmoid,
    biases = {},
  } = config

  const totalNodes = inputCount + hiddenCount + outputCount
  const inputNodes = Array.from({ length: inputCount }, (_, i) => i)
  const outputNodes = Array.from(
    { length: outputCount },
    (_, i) => inputCount + hiddenCount + i
  )

  // Group links by target node for topological action ordering
  const linksByTarget = new Map<number, typeof links>()
  for (const link of links) {
    const to = link[1]
    if (!linksByTarget.has(to)) {
      linksByTarget.set(to, [])
    }
    linksByTarget.get(to)?.push(link)
  }

  // Build actions in topological order: for each non-input node,
  // emit all incoming links then the activation
  const actions: Phenotype['actions'] = []
  for (let node = inputCount; node < totalNodes; node++) {
    const nodeLinks = linksByTarget.get(node) ?? []
    for (const [from, to, weight] of nodeLinks) {
      actions.push([PhenotypeActionType.Link, from, to, weight])
    }
    const isOutput = node >= inputCount + hiddenCount
    const activation = isOutput ? outputActivation : hiddenActivation
    actions.push([
      PhenotypeActionType.Activation,
      node,
      biases[node] ?? 0,
      activation,
    ])
  }

  return {
    length: totalNodes,
    inputs: inputNodes,
    outputs: outputNodes,
    actions,
  }
}

describe('createTrainableExecutor', () => {
  describe('forward pass', () => {
    it('should produce correct output for a single-link linear network', () => {
      // 1 input (node 0) → 1 output (node 1), weight=2, linear activation, no hidden
      const phenotype = makePhenotype({
        inputs: 1,
        hiddenCount: 0,
        outputs: 1,
        links: [[0, 1, 2.0]],
        outputActivation: Activation.Linear,
      })

      const executor = createTrainableExecutor(phenotype)
      const output = executor.forward([3.0])
      expect(output[0]).toBeCloseTo(6.0)
    })

    it('should produce correct output with sigmoid activation', () => {
      // 1 input → 1 output, weight=0, sigmoid → output should be sigmoid(0) = 0.5
      const phenotype = makePhenotype({
        inputs: 1,
        hiddenCount: 0,
        outputs: 1,
        links: [[0, 1, 0.0]],
        outputActivation: Activation.Sigmoid,
      })

      const executor = createTrainableExecutor(phenotype)
      const output = executor.forward([1.0])
      expect(output[0]).toBeCloseTo(0.5) // sigmoid(0) = 0.5
    })

    it('should handle a two-layer network', () => {
      // 2 inputs → 1 hidden (sigmoid) → 1 output (linear)
      // Nodes: 0=in, 1=in, 2=hidden, 3=output
      const phenotype = makePhenotype({
        inputs: 2,
        hiddenCount: 1,
        outputs: 1,
        links: [
          [0, 2, 1.0],
          [1, 2, 1.0],
          [2, 3, 1.0],
        ],
        hiddenActivation: Activation.Sigmoid,
        outputActivation: Activation.Linear,
      })

      const executor = createTrainableExecutor(phenotype)
      const output = executor.forward([0.5, 0.5])
      // hidden: sigmoid(0.5 + 0.5) = sigmoid(1.0) ≈ 0.7311
      // output: linear(0.7311) = 0.7311
      const expected = 1 / (1 + Math.exp(-1.0))
      expect(output[0]).toBeCloseTo(expected)
    })
  })

  describe('backward pass — gradient verification', () => {
    it('should compute correct weight gradient for a linear network', () => {
      // Single link: input → output (linear), weight = 0.5
      // Forward: output = input * weight = 3.0 * 0.5 = 1.5
      // Target: 3.0, Error: 1.5 - 3.0 = -1.5
      // dL/dw = error * input = -1.5 * 3.0 = -4.5
      // Updated weight = 0.5 - lr * (-4.5) = 0.5 + 0.45 = 0.95 (lr=0.1)
      const phenotype = makePhenotype({
        inputs: 1,
        hiddenCount: 0,
        outputs: 1,
        links: [[0, 1, 0.5]],
        outputActivation: Activation.Linear,
      })

      const executor = createTrainableExecutor(phenotype)
      executor.forward([3.0])
      // MSE gradient: dL/d_output = predicted - target = 1.5 - 3.0 = -1.5
      executor.backward(new Float64Array([-1.5]), 0.1)

      // Check weight was updated
      const actions = executor.getUpdatedActions()
      const linkAction = actions.find((a) => a[0] === PhenotypeActionType.Link)
      expect(linkAction?.[3]).toBeCloseTo(0.95)
    })

    it('should verify gradient numerically (finite differences)', () => {
      // 2 inputs → 1 hidden (Tanh) → 1 output (Linear)
      const makeNet = (w: number[]) =>
        makePhenotype({
          inputs: 2,
          hiddenCount: 1,
          outputs: 1,
          links: [
            [0, 2, w[0] as number],
            [1, 2, w[1] as number],
            [2, 3, w[2] as number],
          ],
          hiddenActivation: Activation.Tanh,
          outputActivation: Activation.Linear,
        })

      const input = [0.6, -0.4]
      const target = 0.8
      const weights = [0.3, -0.5, 0.7]
      const epsilon = 1e-5

      // Compute analytical gradient via backprop
      const executor = createTrainableExecutor(makeNet(weights))
      const output = executor.forward(input)
      const error = (output[0] as number) - target
      executor.backward(new Float64Array([error]), 0)

      // Extract weight gradients by comparing original vs updated
      // Since lr=0, weights didn't change. Re-run with lr=1 to get gradient directly.
      const executor2 = createTrainableExecutor(makeNet(weights))
      executor2.forward(input)
      executor2.backward(new Float64Array([error]), 1.0)
      const updatedActions = executor2.getUpdatedActions()

      // Extract analytical gradients (gradient = original - updated when lr=1)
      const analyticalGrads: number[] = []
      let linkIdx = 0
      for (const action of updatedActions) {
        if (action[0] === PhenotypeActionType.Link) {
          analyticalGrads.push(
            (weights[linkIdx] as number) - (action[3] as number)
          )
          linkIdx++
        }
      }

      // Compute numerical gradients via finite differences
      const mseLoss = (w: number[]) => {
        const e = createTrainableExecutor(makeNet(w))
        const o = e.forward(input)
        const diff = (o[0] as number) - target
        return 0.5 * diff * diff
      }

      for (let i = 0; i < weights.length; i++) {
        const wPlus = [...weights]
        const wMinus = [...weights]
        wPlus[i] = (wPlus[i] as number) + epsilon
        wMinus[i] = (wMinus[i] as number) - epsilon
        const numericalGrad = (mseLoss(wPlus) - mseLoss(wMinus)) / (2 * epsilon)
        expect(analyticalGrads[i]).toBeCloseTo(numericalGrad, 4)
      }
    })
  })

  describe('training convergence', () => {
    it('should learn a simple linear function', () => {
      // Learn f(x) = 2x with MSE loss
      const phenotype = makePhenotype({
        inputs: 1,
        hiddenCount: 0,
        outputs: 1,
        links: [[0, 1, 0.0]], // start with weight=0
        outputActivation: Activation.Linear,
      })

      const executor = createTrainableExecutor(phenotype)
      const lr = 0.01
      const samples = [
        [1.0, 2.0],
        [2.0, 4.0],
        [3.0, 6.0],
        [-1.0, -2.0],
      ] as const

      // Train for several epochs
      for (let epoch = 0; epoch < 200; epoch++) {
        for (const [input, target] of samples) {
          const output = executor.forward([input])
          const error = (output[0] as number) - target
          executor.backward(new Float64Array([error]), lr)
        }
      }

      // Verify the network learned weight ≈ 2.0
      const finalOutput = executor.forward([5.0])
      expect(finalOutput[0]).toBeCloseTo(10.0, 1)
    })

    it('should learn XOR with a hidden layer', () => {
      // 2 inputs → 2 hidden (Tanh) → 1 output (Sigmoid)
      // Nodes: 0,1=inputs, 2,3=hidden, 4=output
      const phenotype = makePhenotype({
        inputs: 2,
        hiddenCount: 2,
        outputs: 1,
        links: [
          [0, 2, 0.5],
          [1, 2, 0.5],
          [0, 3, -0.5],
          [1, 3, -0.5],
          [2, 4, 0.8],
          [3, 4, 0.8],
        ],
        hiddenActivation: Activation.Tanh,
        outputActivation: Activation.Sigmoid,
        biases: { 2: -0.3, 3: 0.3 },
      })

      const executor = createTrainableExecutor(phenotype)
      const lr = 0.5
      const xorData = [
        { input: [0, 0], target: 0 },
        { input: [0, 1], target: 1 },
        { input: [1, 0], target: 1 },
        { input: [1, 1], target: 0 },
      ] as const

      for (let epoch = 0; epoch < 2000; epoch++) {
        for (const { input, target } of xorData) {
          const output = executor.forward(input)
          // Binary cross-entropy gradient for sigmoid output: predicted - target
          const error = (output[0] as number) - target
          executor.backward(new Float64Array([error]), lr)
        }
      }

      // Verify XOR outputs
      for (const { input, target } of xorData) {
        const output = executor.forward(input)
        expect(output[0]).toBeCloseTo(target, 1)
      }
    })
  })

  describe('getUpdatedActions', () => {
    it('should return actions with updated weights and biases', () => {
      const phenotype = makePhenotype({
        inputs: 1,
        hiddenCount: 0,
        outputs: 1,
        links: [[0, 1, 1.0]],
        outputActivation: Activation.Linear,
        biases: { 1: 0.5 },
      })

      const executor = createTrainableExecutor(phenotype)
      executor.forward([2.0])
      // output = 2.0 * 1.0 + 0.5 = 2.5 (linear)
      // error: 2.5 - 1.0 = 1.5
      executor.backward(new Float64Array([1.5]), 0.1)

      const actions = executor.getUpdatedActions()
      expect(actions).toHaveLength(2) // 1 link + 1 activation

      // Link weight should have changed
      const link = actions.find((a) => a[0] === PhenotypeActionType.Link)
      expect(link?.[3]).not.toBe(1.0)

      // Bias should have changed
      const act = actions.find((a) => a[0] === PhenotypeActionType.Activation)
      expect(act?.[2]).not.toBe(0.5)
    })

    it('should preserve action structure (types, node indices, activation kinds)', () => {
      const phenotype = makePhenotype({
        inputs: 2,
        hiddenCount: 1,
        outputs: 1,
        links: [
          [0, 2, 0.3],
          [1, 2, -0.4],
          [2, 3, 0.7],
        ],
        hiddenActivation: Activation.ReLU,
        outputActivation: Activation.Sigmoid,
      })

      const executor = createTrainableExecutor(phenotype)
      const actions = executor.getUpdatedActions()

      // Before any training, actions should match original phenotype
      expect(actions).toHaveLength(phenotype.actions.length)
      for (let i = 0; i < actions.length; i++) {
        const orig = phenotype.actions[i] as (typeof phenotype.actions)[number]
        const updated = actions[i] as (typeof actions)[number]
        expect(updated[0]).toBe(orig[0]) // action type
        expect(updated[1]).toBe(orig[1]) // node/from index
        if (orig[0] === PhenotypeActionType.Link) {
          expect(updated[2]).toBe(orig[2]) // to index
          expect(updated[3]).toBeCloseTo(orig[3] as number) // weight
        } else {
          expect(updated[2]).toBeCloseTo(orig[2] as number) // bias
          expect(updated[3]).toBe(orig[3]) // activation enum
        }
      }
    })
  })

  describe('error handling', () => {
    it('should throw for Softmax output activation', () => {
      const phenotype = makePhenotype({
        inputs: 1,
        hiddenCount: 0,
        outputs: 1,
        links: [[0, 1, 1.0]],
        outputActivation: Activation.Softmax,
      })

      expect(() => createTrainableExecutor(phenotype)).toThrow(/Softmax/)
    })

    it('should throw for Step hidden activation during backward pass', () => {
      const phenotype = makePhenotype({
        inputs: 1,
        hiddenCount: 1,
        outputs: 1,
        links: [
          [0, 2, 1.0],
          [2, 3, 1.0],
        ],
        hiddenActivation: Activation.Step,
        outputActivation: Activation.Linear,
      })

      const executor = createTrainableExecutor(phenotype)
      executor.forward([1.0])
      expect(() => executor.backward(new Float64Array([1.0]), 0.1)).toThrow(
        /Step/
      )
    })
  })
})
