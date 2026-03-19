import type {
  StaticExecutor,
  TrainableExecutor,
} from '@neat-evolution/executor'
import { describe, expect, it } from 'vitest'
import { createDeepQLearningStepAgent } from '../src/features/q-learning/createDeepQLearningStepAgent.js'

function createMockTrainableExecutor(): TrainableExecutor & {
  backwardCalls: Array<{ errors: number[]; learningRate: number }>
  snapshotCalls: number
} {
  const backwardCalls: Array<{ errors: number[]; learningRate: number }> = []
  let snapshotCalls = 0
  const outputs = new Map<string, Float64Array>([
    ['1,0', new Float64Array([0.2, 0.8])],
    ['0,1', new Float64Array([0.9, 0.1])],
  ])

  const forward = (inputs: number[] | Float64Array): Float64Array => {
    const key = Array.from(inputs).join(',')
    const output = outputs.get(key)
    if (output === undefined) {
      throw new Error(`Unexpected forward input: ${key}`)
    }
    return Float64Array.from(output)
  }

  const createSnapshot = (): StaticExecutor => {
    snapshotCalls += 1
    return {
      forward,
      forwardBatch(batch: Array<number[] | Float64Array>): Float64Array[] {
        return batch.map((inputs) => forward(inputs))
      },
    }
  }

  return {
    backwardCalls,
    get snapshotCalls() {
      return snapshotCalls
    },
    forward,
    forwardBatch(batch: Array<number[] | Float64Array>): Float64Array[] {
      return batch.map((inputs) => forward(inputs))
    },
    backward(outputErrors: Float64Array, learningRate: number): void {
      backwardCalls.push({ errors: Array.from(outputErrors), learningRate })
    },
    createSnapshot,
    getUpdatedActions() {
      return { actions: [] }
    },
    getWeightGradients() {
      return new Float64Array(0)
    },
    accumulateBackward() {},
    applyGradients() {},
    zeroGradients() {},
  }
}

describe('createDeepQLearningStepAgent', () => {
  it('uses replay training and target snapshots', () => {
    const executor = createMockTrainableExecutor()
    const agent = createDeepQLearningStepAgent(
      executor,
      {
        learningRate: 0.1,
        actionCount: 2,
        discountFactor: 0.5,
        epsilonInitial: 0,
        replayCapacity: 8,
        replayBatchSize: 1,
        replayWarmupSize: 1,
        targetSyncInterval: 1,
      },
      () => 0
    )

    agent.startEpisode({ episodeIndex: 0 })
    agent.act(new Float64Array([1, 0]))
    agent.completeStep({
      reward: 1,
      nextState: new Float64Array([0, 1]),
      terminated: false,
      truncated: true,
    })
    agent.endEpisode({
      fitness: 1,
      episodeReturn: 1,
      totalSteps: 1,
      terminated: false,
      truncated: true,
    })

    expect(executor.backwardCalls).toHaveLength(1)
    expect(executor.snapshotCalls).toBeGreaterThan(1)
  })
})
