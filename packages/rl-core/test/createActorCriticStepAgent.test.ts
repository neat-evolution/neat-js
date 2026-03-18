import type { TrainableExecutor } from '@neat-evolution/executor'
import { describe, expect, it } from 'vitest'
import { createActorCriticStepAgent } from '../src/features/actor-critic/createActorCriticStepAgent.js'

function createMockTrainableExecutor(): TrainableExecutor & {
  backwardCalls: Array<{ errors: number[]; learningRate: number }>
} {
  const backwardCalls: Array<{ errors: number[]; learningRate: number }> = []
  const outputs = new Map<string, Float64Array>([
    ['1,0,0', new Float64Array([1, 0, 0, 0.25])],
    ['0,1,0', new Float64Array([0, 1, 0, 0.5])],
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
      backwardCalls.push({
        errors: Array.from(outputErrors),
        learningRate,
      })
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

describe('createActorCriticStepAgent', () => {
  it('uses nextState value estimates for truncated-step bootstrap', () => {
    const executor = createMockTrainableExecutor()
    const agent = createActorCriticStepAgent(
      executor,
      {
        learningRate: 0.1,
        actionCount: 3,
        gradientConfig: {
          discountFactor: 0.5,
          entropyCoefficient: 0,
          clipGradients: false,
          gradientClipValue: 1,
        },
        rolloutConfig: {
          rolloutLength: 'episode',
        },
      },
      () => 0
    )

    agent.startEpisode({ episodeIndex: 0 })
    const action = agent.act(new Float64Array([1, 0, 0]))
    expect(Array.from(action)).toEqual([1, 0, 0])

    agent.completeStep({
      reward: 1,
      nextState: new Float64Array([0, 1, 0]),
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
    expect(executor.backwardCalls[0]?.learningRate).toBe(0.1)
    expect(executor.backwardCalls[0]?.errors[0]).toBe(-0.75)
    expect(executor.backwardCalls[0]?.errors[3]).toBe(-0.75)
  })

  it('requires open steps to be finalized before another act call', () => {
    const executor = createMockTrainableExecutor()
    const agent = createActorCriticStepAgent(
      executor,
      {
        learningRate: 0.1,
        actionCount: 3,
        gradientConfig: {
          discountFactor: 0.5,
          entropyCoefficient: 0,
          clipGradients: false,
          gradientClipValue: 1,
        },
        rolloutConfig: {
          rolloutLength: 'episode',
        },
      },
      () => 0
    )

    agent.startEpisode({ episodeIndex: 0 })
    agent.act(new Float64Array([1, 0, 0]))

    expect(() => agent.act(new Float64Array([1, 0, 0]))).toThrow(
      'completeStep() must be called before act() opens another step'
    )
  })

  it('supports grouped binary actor outputs in multi-discrete mode', () => {
    const backwardCalls: Array<{ errors: number[]; learningRate: number }> = []
    const executor: TrainableExecutor & {
      backwardCalls: Array<{ errors: number[]; learningRate: number }>
    } = {
      backwardCalls,
      forward(inputs: number[] | Float64Array): Float64Array {
        const key = Array.from(inputs).join(',')
        if (key === '1,0,0') {
          return new Float64Array([0.8, 0.2, 0.3, 0.7, 0.4])
        }
        if (key === '0,1,0') {
          return new Float64Array([0.6, 0.4, 0.9, 0.1, 0.5])
        }
        throw new Error(`Unexpected forward input: ${key}`)
      },
      forwardBatch(batch: Array<number[] | Float64Array>): Float64Array[] {
        return batch.map((inputs) => this.forward(inputs))
      },
      backward(outputErrors: Float64Array, learningRate: number): void {
        backwardCalls.push({
          errors: Array.from(outputErrors),
          learningRate,
        })
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

    const agent = createActorCriticStepAgent(
      executor,
      {
        learningRate: 0.1,
        actionCount: 2,
        multiDiscrete: true,
        gradientConfig: {
          discountFactor: 0.5,
          entropyCoefficient: 0,
          clipGradients: false,
          gradientClipValue: 1,
        },
        rolloutConfig: {
          rolloutLength: 'episode',
        },
      },
      () => 0
    )

    agent.startEpisode({ episodeIndex: 0 })
    const action = agent.act(new Float64Array([1, 0, 0]))
    expect(Array.from(action)).toEqual([1, 1])

    agent.completeStep({
      reward: 1,
      nextState: new Float64Array([0, 1, 0]),
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
    expect(executor.backwardCalls[0]?.errors).toHaveLength(5)
  })
})
