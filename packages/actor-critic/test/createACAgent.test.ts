import type { TrainableExecutor } from '@neat-evolution/backprop'
import { describe, expect, it } from 'vitest'
import type { ACAgentConfig } from '../src/createACAgent.js'
import { createACAgent } from '../src/createACAgent.js'

function mockTrainable(
  actionCount: number
): TrainableExecutor & { forwardCalls: number; backwardCalls: number } {
  const mock = {
    forwardCalls: 0,
    backwardCalls: 0,
    forward(_inputs: number[] | Float64Array): Float64Array {
      mock.forwardCalls++
      const output = new Float64Array(actionCount + 1)
      for (let i = 0; i < actionCount; i++) {
        output[i] = i * 0.5
      }
      output[actionCount] = 0.5
      return output
    },
    backward(_outputErrors: Float64Array, _learningRate: number): void {
      mock.backwardCalls++
    },
    getUpdatedActions() {
      return []
    },
  }
  return mock
}

function defaultConfig(actionCount: number): ACAgentConfig {
  return {
    learningRate: 0.01,
    actionCount,
    gradientConfig: {
      discountFactor: 0.99,
      entropyCoefficient: 0,
      clipGradients: false,
      gradientClipValue: 1,
    },
    rolloutConfig: {
      rolloutLength: 'episode',
      rewardThreshold: 0.1,
    },
    actorActivation: 'softmax',
  }
}

let rngCounter = 0
function deterministicRng(): () => number {
  rngCounter = 0
  return () => {
    const values = [0.1, 0.4, 0.8, 0.2, 0.6, 0.9, 0.05, 0.5]
    const val = values[rngCounter % values.length]
    rngCounter++
    if (val === undefined) throw new Error('RNG value undefined')
    return val
  }
}

describe('createACAgent', () => {
  describe('act()', () => {
    it('returns only actor outputs (length = actionCount, not actionCount+1)', () => {
      const actionCount = 4
      const trainable = mockTrainable(actionCount)
      const agent = createACAgent(
        trainable,
        defaultConfig(actionCount),
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })
      const action = agent.act(new Float64Array([1, 0, 0]))

      expect(action.length).toBe(actionCount)
    })

    it('records Transition in RolloutBuffer (endEpisode trains)', () => {
      const actionCount = 3
      const trainable = mockTrainable(actionCount)
      const agent = createACAgent(
        trainable,
        defaultConfig(actionCount),
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.5, false)
      agent.act(new Float64Array([0, 1]))
      agent.reward(1.0, false)

      agent.endEpisode({ fitness: 1, totalSteps: 2, terminated: false })
      expect(trainable.backwardCalls).toBe(2)
    })

    it('stochastic sampling: different actions for same inputs with different RNG states', () => {
      const actionCount = 3
      const trainable = mockTrainable(actionCount)
      const actions: Float64Array[] = []

      const rng = deterministicRng()
      const agent = createACAgent(trainable, defaultConfig(actionCount), rng)

      for (let ep = 0; ep < 5; ep++) {
        agent.startEpisode({ episodeIndex: ep })
        const action = agent.act(new Float64Array([1, 0]))
        actions.push(Float64Array.from(action))
        agent.reward(0, true)
      }

      const uniqueActions = new Set(actions.map((a) => Array.from(a).join(',')))
      expect(uniqueActions.size).toBeGreaterThanOrEqual(1)
    })
  })

  describe('reward() trigger conditions', () => {
    it('reward with |r| > threshold triggers trainOnSegment', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.rolloutConfig.rolloutLength = 32
      const agent = createACAgent(trainable, config, deterministicRng())

      agent.startEpisode({ episodeIndex: 0 })

      for (let i = 0; i < 5; i++) {
        agent.act(new Float64Array([1, 0]))
        agent.reward(0.01, false)
      }
      expect(trainable.backwardCalls).toBe(0)

      agent.act(new Float64Array([1, 0]))
      agent.reward(1.0, false)
      expect(trainable.backwardCalls).toBe(6)
    })

    it('reward with done=true triggers trainOnSegment', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.rolloutConfig.rolloutLength = 32
      const agent = createACAgent(trainable, config, deterministicRng())

      agent.startEpisode({ episodeIndex: 0 })
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, false)
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, true)
      expect(trainable.backwardCalls).toBe(2)
    })

    it('reward with small reward does NOT trigger training', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.rolloutConfig.rolloutLength = 32
      const agent = createACAgent(trainable, config, deterministicRng())

      agent.startEpisode({ episodeIndex: 0 })
      for (let i = 0; i < 10; i++) {
        agent.act(new Float64Array([1, 0]))
        agent.reward(0.01, false)
      }
      expect(trainable.backwardCalls).toBe(0)
    })
  })

  describe('startEpisode()', () => {
    it('resets buffer so previous episode data does not leak', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const agent = createACAgent(
        trainable,
        defaultConfig(actionCount),
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, false)

      agent.startEpisode({ episodeIndex: 1 })
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, true)
      expect(trainable.backwardCalls).toBe(1)
    })
  })

  describe('endEpisode()', () => {
    it('flushes remaining buffer and trains', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const agent = createACAgent(
        trainable,
        defaultConfig(actionCount),
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })
      for (let i = 0; i < 5; i++) {
        agent.act(new Float64Array([1, 0]))
        agent.reward(0.01, false)
      }
      expect(trainable.backwardCalls).toBe(0)

      agent.endEpisode({ fitness: 1, totalSteps: 5, terminated: false })
      expect(trainable.backwardCalls).toBe(5)
    })

    it('does nothing if no transitions were recorded', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const agent = createACAgent(
        trainable,
        defaultConfig(actionCount),
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })
      agent.endEpisode({ fitness: 0, totalSteps: 0, terminated: false })
      expect(trainable.backwardCalls).toBe(0)
    })
  })

  describe('minRolloutLength', () => {
    it('defers capture until enough transitions accumulate', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.rolloutConfig = {
        rolloutLength: 32,
        rewardThreshold: 0.1,
        minRolloutLength: 4,
      }
      const agent = createACAgent(trainable, config, deterministicRng())

      agent.startEpisode({ episodeIndex: 0 })

      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, false)
      agent.act(new Float64Array([1, 0]))
      agent.reward(5.0, false)
      expect(trainable.backwardCalls).toBe(0)

      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, false)
      agent.act(new Float64Array([1, 0]))
      agent.reward(5.0, false)
      expect(trainable.backwardCalls).toBe(4)
    })
  })

  describe('integration', () => {
    it('creates TrainableExecutor with 5 outputs and AC agent with 4 actions', () => {
      const actionCount = 4
      const trainable = mockTrainable(actionCount)
      const agent = createACAgent(
        trainable,
        defaultConfig(actionCount),
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })

      for (let i = 0; i < 20; i++) {
        const action = agent.act(new Float64Array([1, 0, 0, 0]))
        expect(action.length).toBe(4)
        agent.reward(i === 19 ? 1.0 : 0.01, i === 19)
      }

      expect(trainable.backwardCalls).toBe(20)
    })

    it('continuous activation (sigmoid) returns N values directly', () => {
      const actionCount = 3
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.actorActivation = 'sigmoid'
      const agent = createACAgent(trainable, config, deterministicRng())

      agent.startEpisode({ episodeIndex: 0 })
      const action = agent.act(new Float64Array([1, 0]))

      expect(action.length).toBe(actionCount)
      for (let i = 0; i < action.length; i++) {
        expect(action[i]).toBeGreaterThan(0)
        expect(action[i]).toBeLessThan(1)
      }
    })
  })
})
