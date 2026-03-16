import type { TrainableExecutor } from '@neat-evolution/executor'
import { describe, expect, it, vi } from 'vitest'
import type { ACAgentConfig } from '../src/createACAgent.js'
import { createACAgent } from '../src/createACAgent.js'

function mockTrainable(
  actionCount: number,
  multiDiscrete = false
): TrainableExecutor & { forwardCalls: number; backwardCalls: number } {
  const outputCount = multiDiscrete ? 2 * actionCount + 1 : actionCount + 1
  const mock = {
    forwardCalls: 0,
    backwardCalls: 0,
    forward(_inputs: number[] | Float64Array): Float64Array {
      mock.forwardCalls++
      const output = new Float64Array(outputCount)
      if (multiDiscrete) {
        // N pairs of [P_on, P_off] softmax probabilities + 1 critic
        for (let i = 0; i < actionCount; i++) {
          output[2 * i] = 0.6 // P_on
          output[2 * i + 1] = 0.4 // P_off
        }
        output[2 * actionCount] = 0.5 // critic
      } else {
        for (let i = 0; i < actionCount; i++) {
          output[i] = i * 0.5
        }
        output[actionCount] = 0.5
      }
      return output
    },
    backward(_outputErrors: Float64Array, _learningRate: number): void {
      mock.backwardCalls++
    },
    forwardBatch(batch: Array<number[] | Float64Array>) {
      return batch.map((input) => mock.forward(input))
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
      agent.reward(0.5, false, false)
      agent.act(new Float64Array([0, 1]))
      agent.reward(1.0, false, false)

      agent.endEpisode({
        fitness: 1,
        episodeReturn: 1.5,
        totalSteps: 2,
        terminated: false,
      })
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
        agent.reward(0, true, false)
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
        agent.reward(0.01, false, false)
      }
      expect(trainable.backwardCalls).toBe(0)

      agent.act(new Float64Array([1, 0]))
      agent.reward(1.0, false, false)
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
      agent.reward(0.01, false, false)
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, true, false)
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
        agent.reward(0.01, false, false)
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
      agent.reward(0.01, false, false)

      agent.startEpisode({ episodeIndex: 1 })
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, true, false)
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
        agent.reward(0.01, false, false)
      }
      expect(trainable.backwardCalls).toBe(0)

      agent.endEpisode({
        fitness: 1,
        episodeReturn: 0.05,
        totalSteps: 5,
        terminated: false,
      })
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
      agent.endEpisode({
        fitness: 0,
        episodeReturn: 0,
        totalSteps: 0,
        terminated: false,
      })
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
      agent.reward(0.01, false, false)
      agent.act(new Float64Array([1, 0]))
      agent.reward(5.0, false, false)
      expect(trainable.backwardCalls).toBe(0)

      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, false, false)
      agent.act(new Float64Array([1, 0]))
      agent.reward(5.0, false, false)
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
        agent.reward(i === 19 ? 1.0 : 0.01, i === 19, false)
      }

      expect(trainable.backwardCalls).toBe(20)
    })

    it('samples action stochastically from executor output probabilities', () => {
      const actionCount = 3
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      const agent = createACAgent(trainable, config, deterministicRng())

      agent.startEpisode({ episodeIndex: 0 })
      const action = agent.act(new Float64Array([1, 0]))

      // Action should be one-hot (sampled from probabilities)
      expect(action.length).toBe(actionCount)
      let oneHotSum = 0
      for (let i = 0; i < action.length; i++) {
        oneHotSum += action[i] as number
      }
      expect(oneHotSum).toBe(1)
    })
  })

  describe('multi-discrete mode', () => {
    function multiDiscreteConfig(factorCount: number): ACAgentConfig {
      return {
        learningRate: 0.01,
        actionCount: factorCount,
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
        multiDiscrete: true,
      }
    }

    it('returns N-length action from 2N+1 internal outputs', () => {
      const factorCount = 3
      const trainable = mockTrainable(factorCount, true)
      const agent = createACAgent(
        trainable,
        multiDiscreteConfig(factorCount),
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })
      const action = agent.act(new Float64Array([1, 0, 0]))

      // Environment receives N values, not 2N+1
      expect(action.length).toBe(factorCount)
    })

    it('each returned value is 0 or 1', () => {
      const factorCount = 4
      const trainable = mockTrainable(factorCount, true)
      const agent = createACAgent(
        trainable,
        multiDiscreteConfig(factorCount),
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })
      const action = agent.act(new Float64Array([1, 0, 0, 0]))

      for (let i = 0; i < action.length; i++) {
        const val = action[i] as number
        expect(val === 0 || val === 1).toBe(true)
      }
    })

    it('training happens correctly (backward called)', () => {
      const factorCount = 3
      const trainable = mockTrainable(factorCount, true)
      const agent = createACAgent(
        trainable,
        multiDiscreteConfig(factorCount),
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })
      agent.act(new Float64Array([1, 0, 0]))
      agent.reward(0.5, false, false)
      agent.act(new Float64Array([0, 1, 0]))
      agent.reward(1.0, false, false)

      agent.endEpisode({
        fitness: 1,
        episodeReturn: 1.5,
        totalSteps: 2,
        terminated: false,
      })
      expect(trainable.backwardCalls).toBe(2)
    })
  })

  describe('telemetry hooks', () => {
    it('calls onSegmentTrained whenever training runs', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const onSegmentTrained = vi.fn()
      const agent = createACAgent(
        trainable,
        {
          ...defaultConfig(actionCount),
          rolloutConfig: { rolloutLength: 2, rewardThreshold: 0.1 },
          onSegmentTrained,
        },
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })
      agent.act(new Float64Array([1, 0]))
      agent.reward(1, false, false)

      expect(onSegmentTrained).toHaveBeenCalledTimes(1)
    })
  })
})
