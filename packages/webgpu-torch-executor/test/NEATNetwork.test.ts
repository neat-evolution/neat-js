import { describe, expect, test } from 'vitest'

import { type NEATGenome } from '../src/core/NEATGenome.js'
import { NodeType } from '../src/core/node/Node.js'
import { Activation } from '../src/executor/Activation.js'
import { NEATNetwork } from '../src/webgpu-torch-executor/NEATNetwork.js'

describe.skip('NEATNetwork XOR Test', () => {
  test('should solve XOR problem', async () => {
    const xorGenome: NEATGenome<any, any, any> = {
      nodes: [
        {
          id: 0,
          type: NodeType.Input,
          bias: 0,
          activation: Activation.Linear,
        },
        {
          id: 1,
          type: NodeType.Input,
          bias: 0,
          activation: Activation.Linear,
        },
        {
          id: 2,
          type: NodeType.Hidden,
          bias: -5,
          activation: Activation.Sigmoid,
        }, // bias and activation for the hidden layer may vary based on training
        {
          id: 3,
          type: NodeType.Hidden,
          bias: 15,
          activation: Activation.Sigmoid,
        },
        {
          id: 4,
          type: NodeType.Output,
          bias: 0,
          activation: Activation.Sigmoid,
        },
      ],
      edges: [
        { from: 0, to: 2, weight: 20 }, // I1 -> H1
        { from: 0, to: 3, weight: -20 }, // I1 -> H2
        { from: 1, to: 2, weight: 20 }, // I2 -> H1
        { from: 1, to: 3, weight: -20 }, // I2 -> H2
        { from: 2, to: 4, weight: 10 }, // H1 -> O
        { from: 3, to: 4, weight: 10 }, // H2 -> O
      ],
    }
    const network = new NEATNetwork(xorGenome)

    const testCases = [
      { input: [0, 0], expected: [0] },
      { input: [0, 1], expected: [1] },
      { input: [1, 0], expected: [1] },
      { input: [1, 1], expected: [0] },
    ]

    for (const testCase of testCases) {
      const output = await network.evaluate(testCase.input)
      expect(output[0]).toBeCloseTo(testCase.expected[0] as number, 0.1) // Assuming a tolerance of 0.1
    }
  })
})
