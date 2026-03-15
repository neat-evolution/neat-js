import type { TrainableExecutor } from '@neat-evolution/backprop'
import type { RNG } from '@neat-evolution/utils'
import { describe, expect, it, vi } from 'vitest'
import type { QLAgentConfig } from '../src/createQLAgent.js'
import { createQLAgent } from '../src/createQLAgent.js'

function mockTrainable(
  outputCount: number
): TrainableExecutor & { forwardCalls: number; backwardCalls: number } {
  const mock = {
    forwardCalls: 0,
    backwardCalls: 0,
    forward(_inputs: number[] | Float64Array): Float64Array {
      mock.forwardCalls++
      const output = new Float64Array(outputCount)
      for (let i = 0; i < outputCount; i++) {
        output[i] = (i + 1) * 0.1
      }
      return output
    },
    forwardBatch(batch: Array<number[] | Float64Array>) {
      return batch.map((input) => mock.forward(input))
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

const rngFrom = (fn: () => number): RNG => ({
  gen: () => fn(),
  genRange: (min: number, max: number) => {
    if (max <= min) {
      throw new Error('max must be greater than min')
    }
    return min + Math.floor(fn() * (max - min))
  },
  genBool: () => fn() < 0.5,
})

const createSequenceRng = (values: number[]): RNG => {
  let idx = 0
  return rngFrom(() => {
    const value = values[idx % values.length]
    idx++
    if (value === undefined) {
      throw new Error('RNG value undefined')
    }
    return value
  })
}

/**
 * Mock trainable that returns controlled Q-values, useful for testing
 * that argmax selects the correct action.
 */
function mockTrainableWithQValues(
  qValues: number[]
): TrainableExecutor & { backwardCalls: number } {
  const mock = {
    backwardCalls: 0,
    forward(_inputs: number[] | Float64Array): Float64Array {
      return new Float64Array(qValues)
    },
    forwardBatch(batch: Array<number[] | Float64Array>) {
      return batch.map((input) => mock.forward(input))
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

function defaultConfig(actionCount: number): QLAgentConfig {
  return {
    learningRate: 0.01,
    actionCount,
    discountFactor: 0.99,
    rolloutConfig: {
      rolloutLength: 'episode',
      rewardThreshold: 0.1,
    },
    epsilonInitial: 0.1,
    epsilonDecayPerEpisode: 1,
    epsilonMinimum: 0,
  }
}

function deterministicRng(): RNG {
  return createSequenceRng([0.5, 0.3, 0.8, 0.2, 0.6, 0.9, 0.05, 0.1])
}

function neverExploreRng(): RNG {
  // Always returns values >= epsilon for greedy decisions
  return rngFrom(() => 0.99)
}

describe('createQLAgent', () => {
  describe('act()', () => {
    it('returns action with length = actionCount (standard mode)', () => {
      const actionCount = 4
      const trainable = mockTrainable(actionCount)
      const agent = createQLAgent(
        trainable,
        defaultConfig(actionCount),
        deterministicRng()
      )

      agent.startEpisode({ episodeIndex: 0 })
      const action = agent.act(new Float64Array([1, 0, 0]))

      expect(action.length).toBe(actionCount)
    })

    it('returns one-hot action in standard mode', () => {
      const actionCount = 3
      const trainable = mockTrainable(actionCount)
      const config = { ...defaultConfig(actionCount), epsilonInitial: 0 }
      const agent = createQLAgent(trainable, config, neverExploreRng())

      agent.startEpisode({ episodeIndex: 0 })
      const action = agent.act(new Float64Array([1, 0]))

      // one-hot: exactly one element is 1, rest are 0
      const sum = Array.from(action).reduce((s, v) => s + v, 0)
      expect(sum).toBe(1)
    })

    it('multi-discrete mode: returns N outputs from 2N internal outputs', () => {
      const actionCount = 4
      const trainable = mockTrainable(2 * actionCount)
      const config: QLAgentConfig = {
        ...defaultConfig(actionCount),
        multiDiscrete: true,
        epsilonInitial: 0,
      }
      const agent = createQLAgent(trainable, config, neverExploreRng())

      agent.startEpisode({ episodeIndex: 0 })
      const action = agent.act(new Float64Array([1, 0, 0]))

      expect(action.length).toBe(actionCount)
      // Each value should be 0 or 1
      for (let i = 0; i < action.length; i++) {
        expect(action[i] === 0 || action[i] === 1).toBe(true)
      }
    })
  })

  describe('epsilon-greedy action selection', () => {
    it('epsilon=1.0: all actions are random', () => {
      const actionCount = 3
      // Q-values: [0.1, 0.9, 0.5] -> greedy would always pick index 1
      const trainable = mockTrainableWithQValues([0.1, 0.9, 0.5])
      const config = { ...defaultConfig(actionCount), epsilonInitial: 1.0 }

      const chosenIndices = new Set<number>()
      let counter = 0
      const rng = rngFrom(() => {
        // First call in each act(): exploration check (always < 1.0 -> explore)
        // Second call: random action selection
        counter++
        if (counter % 2 === 1) return 0.5 // exploration check: 0.5 < 1.0 -> explore
        // For action selection: cycle through different values to get different actions
        const values = [0.1, 0.4, 0.8]
        const idx = Math.floor((counter / 2 - 1) % 3)
        const v = values[idx]
        if (v === undefined) throw new Error('RNG value undefined')
        return v
      })

      const agent = createQLAgent(trainable, config, rng)
      for (let ep = 0; ep < 3; ep++) {
        agent.startEpisode({ episodeIndex: ep })
        const action = agent.act(new Float64Array([1, 0]))
        const idx = Array.from(action).indexOf(1)
        chosenIndices.add(idx)
        agent.reward(0, true)
      }

      // With random exploration across multiple episodes, should pick different actions
      expect(chosenIndices.size).toBeGreaterThan(1)
    })

    it('epsilon=0.0: always picks argmax', () => {
      const actionCount = 3
      // Q-values: [0.1, 0.9, 0.5] -> greedy always picks index 1
      const trainable = mockTrainableWithQValues([0.1, 0.9, 0.5])
      const config = { ...defaultConfig(actionCount), epsilonInitial: 0 }
      const agent = createQLAgent(trainable, config, neverExploreRng())

      agent.startEpisode({ episodeIndex: 0 })
      for (let i = 0; i < 5; i++) {
        const action = agent.act(new Float64Array([1, 0]))
        expect(action[1]).toBe(1) // argmax index
        expect(action[0]).toBe(0)
        expect(action[2]).toBe(0)
        agent.reward(0.01, false)
      }
    })
  })

  describe('epsilon decay', () => {
    it('epsilon decreases after each episode', () => {
      const actionCount = 3
      const trainable = mockTrainableWithQValues([0.1, 0.9, 0.5])
      const config: QLAgentConfig = {
        ...defaultConfig(actionCount),
        epsilonInitial: 1.0,
        epsilonDecayPerEpisode: 0.5,
        epsilonMinimum: 0.01,
      }

      const rng = rngFrom(() => 0.3)

      const agent = createQLAgent(trainable, config, rng)

      // Episode 0: epsilon starts at 1.0
      agent.startEpisode({ episodeIndex: 0 })
      // epsilon decays to max(0.01, 1.0 * 0.5) = 0.5 on startEpisode

      // Episode 1: epsilon = 0.5 after first decay
      agent.startEpisode({ episodeIndex: 1 })
      // epsilon decays to max(0.01, 0.5 * 0.5) = 0.25

      // Episode 2: epsilon = 0.25 -> rng.gen() = 0.3 >= 0.25 -> greedy
      agent.startEpisode({ episodeIndex: 2 })
      // epsilon = max(0.01, 0.25 * 0.5) = 0.125
      const action = agent.act(new Float64Array([1, 0]))
      // 0.3 >= 0.125 -> greedy -> picks argmax (index 1)
      expect(action[1]).toBe(1)
    })

    it('epsilon floors at epsilonMinimum', () => {
      const actionCount = 2
      const trainable = mockTrainableWithQValues([0.1, 0.9])
      const config: QLAgentConfig = {
        ...defaultConfig(actionCount),
        epsilonInitial: 1.0,
        epsilonDecayPerEpisode: 0.1,
        epsilonMinimum: 0.05,
      }

      const agent = createQLAgent(trainable, config, neverExploreRng())

      // Decay through many episodes
      for (let i = 0; i < 50; i++) {
        agent.startEpisode({ episodeIndex: i })
      }

      // After many decays, epsilon should be floored at 0.05
      // With neverExploreRng() returning 0.99, 0.99 >= 0.05 -> greedy
      const action = agent.act(new Float64Array([1, 0]))
      expect(action[1]).toBe(1) // argmax
    })
  })

  describe('reward() trigger conditions', () => {
    it('|reward| > threshold triggers trainOnSegment', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.rolloutConfig.rolloutLength = 32
      config.epsilonInitial = 0
      const agent = createQLAgent(trainable, config, neverExploreRng())

      agent.startEpisode({ episodeIndex: 0 })

      for (let i = 0; i < 5; i++) {
        agent.act(new Float64Array([1, 0]))
        agent.reward(0.01, false)
      }
      expect(trainable.backwardCalls).toBe(0)

      agent.act(new Float64Array([1, 0]))
      agent.reward(1.0, false)
      // Capture + train on 6 transitions
      expect(trainable.backwardCalls).toBe(6)
    })

    it('done=true triggers trainOnSegment', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.rolloutConfig.rolloutLength = 32
      config.epsilonInitial = 0
      const agent = createQLAgent(trainable, config, neverExploreRng())

      agent.startEpisode({ episodeIndex: 0 })
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, false)
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, true)
      expect(trainable.backwardCalls).toBe(2)
    })

    it('small reward does NOT trigger training', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.rolloutConfig.rolloutLength = 32
      config.epsilonInitial = 0
      const agent = createQLAgent(trainable, config, neverExploreRng())

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
      const config = defaultConfig(actionCount)
      config.epsilonInitial = 0
      const agent = createQLAgent(trainable, config, neverExploreRng())

      agent.startEpisode({ episodeIndex: 0 })
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, false)

      agent.startEpisode({ episodeIndex: 1 })
      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, true)
      // Only 1 transition from episode 1 trained (episode 0 was reset)
      expect(trainable.backwardCalls).toBe(1)
    })
  })

  describe('endEpisode()', () => {
    it('flushes remaining buffer and trains', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.epsilonInitial = 0
      const agent = createQLAgent(trainable, config, neverExploreRng())

      agent.startEpisode({ episodeIndex: 0 })
      for (let i = 0; i < 5; i++) {
        agent.act(new Float64Array([1, 0]))
        agent.reward(0.01, false)
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
      const config = defaultConfig(actionCount)
      config.epsilonInitial = 0
      const agent = createQLAgent(trainable, config, neverExploreRng())

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
      const config: QLAgentConfig = {
        ...defaultConfig(actionCount),
        epsilonInitial: 0,
        rolloutConfig: {
          rolloutLength: 32,
          rewardThreshold: 0.1,
          minRolloutLength: 4,
        },
      }
      const agent = createQLAgent(trainable, config, neverExploreRng())

      agent.startEpisode({ episodeIndex: 0 })

      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, false)
      agent.act(new Float64Array([1, 0]))
      agent.reward(5.0, false)
      // Only 2 transitions, minRolloutLength = 4 -> deferred
      expect(trainable.backwardCalls).toBe(0)

      agent.act(new Float64Array([1, 0]))
      agent.reward(0.01, false)
      agent.act(new Float64Array([1, 0]))
      agent.reward(5.0, false)
      // Now 4 transitions -> capture
      expect(trainable.backwardCalls).toBe(4)
    })
  })

  describe('interface compatibility', () => {
    it('implements same EpisodicAgent lifecycle as AC agent', () => {
      const actionCount = 3
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.epsilonInitial = 0
      const agent = createQLAgent(trainable, config, neverExploreRng())

      // Same lifecycle: startEpisode -> act/reward loop -> endEpisode
      expect(typeof agent.act).toBe('function')
      expect(typeof agent.reward).toBe('function')
      expect(typeof agent.startEpisode).toBe('function')
      expect(typeof agent.endEpisode).toBe('function')
    })

    it('can run full episode with proper act/reward flow', () => {
      const actionCount = 4
      const trainable = mockTrainable(actionCount)
      const config = defaultConfig(actionCount)
      config.epsilonInitial = 0
      const agent = createQLAgent(trainable, config, neverExploreRng())

      agent.startEpisode({ episodeIndex: 0 })

      for (let i = 0; i < 20; i++) {
        const action = agent.act(new Float64Array([1, 0, 0, 0]))
        expect(action.length).toBe(4)
        agent.reward(i === 19 ? 1.0 : 0.01, i === 19)
      }

      // done=true on last reward triggers training
      expect(trainable.backwardCalls).toBe(20)
    })
  })

  describe('Q-value convergence', () => {
    it('Q-values converge on a trivial problem (constant reward for one action)', () => {
      // Simple 2-action problem: action 0 always gives reward 1, action 1 gives 0
      const actionCount = 2
      const weights = [0.5, 0.5] // Start with equal Q-values

      const trainable: TrainableExecutor & { getWeights: () => number[] } = {
        getWeights: () => [...weights],
        forward(_inputs: number[] | Float64Array): Float64Array {
          return new Float64Array(weights)
        },
        backward(outputErrors: Float64Array, learningRate: number): void {
          // Simple gradient descent: w -= lr * error
          for (let i = 0; i < weights.length; i++) {
            const w = weights[i]
            const e = outputErrors[i]
            if (w !== undefined && e !== undefined) {
              weights[i] = w - learningRate * e
            }
          }
        },
        forwardBatch(batch: Array<number[] | Float64Array>) {
          return batch.map((input) => this.forward(input))
        },
        getUpdatedActions() {
          return []
        },
      }

      const config: QLAgentConfig = {
        learningRate: 0.1,
        actionCount,
        discountFactor: 0,
        rolloutConfig: {
          rolloutLength: 'episode',
          rewardThreshold: 0.0,
        },
        epsilonInitial: 0.5,
        epsilonDecayPerEpisode: 1,
        epsilonMinimum: 0.5,
      }

      let rngIdx = 0
      const rng = rngFrom(() => {
        // Alternate between exploring and greedy to ensure both actions are tried
        rngIdx++
        return (rngIdx % 7) / 7
      })

      const agent = createQLAgent(trainable, config, rng)

      // Run many episodes
      for (let ep = 0; ep < 100; ep++) {
        agent.startEpisode({ episodeIndex: ep })
        const action = agent.act(new Float64Array([1]))
        // Action 0 -> reward 1, action 1 -> reward 0
        const chosenAction = action[0] === 1 ? 0 : 1
        const reward = chosenAction === 0 ? 1 : 0
        agent.reward(reward, true)
        agent.endEpisode({
          fitness: reward,
          episodeReturn: reward,
          totalSteps: 1,
          terminated: true,
        })
      }

      // After training, Q(action 0) should be higher than Q(action 1)
      const finalWeights = trainable.getWeights()
      const q0 = finalWeights[0]
      const q1 = finalWeights[1]
      if (q0 === undefined || q1 === undefined) {
        throw new Error('Expected weights')
      }
      expect(q0).toBeGreaterThan(q1)
    })
  })

  describe('telemetry hooks', () => {
    it('calls onSegmentTrained whenever training is triggered', () => {
      const actionCount = 2
      const trainable = mockTrainable(actionCount)
      const onSegmentTrained = vi.fn()
      const agent = createQLAgent(
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
      agent.reward(1, false)

      expect(onSegmentTrained).toHaveBeenCalledTimes(1)
    })
  })
})
