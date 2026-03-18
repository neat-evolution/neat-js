import type { TrainableExecutor } from '@neat-evolution/executor'
import { describe, expect, it } from 'vitest'
import { createPPOStepAgent } from '../src/features/actor-critic/createPPOStepAgent.js'

function createMockTrainableExecutor(): TrainableExecutor & {
  backwardCalls: Array<{ errors: number[]; learningRate: number }>
} {
  const backwardCalls: Array<{ errors: number[]; learningRate: number }> = []
  const outputs = new Map<string, Float64Array>([
    ['1,0', new Float64Array([0.6, 0.4, 0.2])],
    ['0,1', new Float64Array([0.3, 0.7, 0.4])],
  ])

  return {
    backwardCalls,
    forward(inputs: number[] | Float64Array): Float64Array {
      const key = Array.from(inputs).join(',')
      const output = outputs.get(key)
      if (output === undefined) {
        throw new Error(`Unexpected forward input: ${key}`)
      }
      return Float64Array.from(output)
    },
    forwardBatch(batch: Array<number[] | Float64Array>): Float64Array[] {
      return batch.map((inputs) => this.forward(inputs))
    },
    backward(outputErrors: Float64Array, learningRate: number): void {
      backwardCalls.push({ errors: Array.from(outputErrors), learningRate })
    },
    createSnapshot() {
      return {
        forward: (inputs: number[] | Float64Array) => this.forward(inputs),
        forwardBatch: (batch: Array<number[] | Float64Array>) =>
          batch.map((inputs) => this.forward(inputs)),
      }
    },
    getUpdatedActions(): [] {
      return []
    },
  }
}

describe('createPPOStepAgent', () => {
  it('reuses collected rollout data across PPO epochs', () => {
    const executor = createMockTrainableExecutor()
    const agent = createPPOStepAgent(
      executor,
      {
        learningRate: 0.1,
        actionCount: 2,
        discountFactor: 0.5,
        clipEpsilon: 0.2,
        entropyCoefficient: 0,
        minibatchSize: 1,
        epochs: 2,
        trajectoryConfig: {
          rolloutLength: 'episode',
          batchTransitions: 2,
        },
      },
      () => 0
    )

    agent.startEpisode({ episodeIndex: 0 })
    agent.act(new Float64Array([1, 0]))
    agent.completeStep({
      reward: 0,
      nextState: new Float64Array([0, 1]),
      terminated: false,
      truncated: false,
    })
    agent.act(new Float64Array([0, 1]))
    agent.completeStep({
      reward: 1,
      nextState: new Float64Array([0, 1]),
      terminated: false,
      truncated: true,
    })
    agent.endEpisode({
      fitness: 1,
      episodeReturn: 1,
      totalSteps: 2,
      terminated: false,
      truncated: true,
    })

    expect(executor.backwardCalls).toHaveLength(4)
  })
})
