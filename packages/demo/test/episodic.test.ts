import {
  Activation,
  type AnyGenome,
  type Phenotype,
  PhenotypeActionType,
} from '@neat-evolution/core'
import {
  createEpisodicAgent,
  type EpisodeResult,
  type EpisodicAgent,
  isAgentEnvironment,
  isEpisodicEnvironment,
} from '@neat-evolution/environment'
import type { SyncExecutor } from '@neat-evolution/executor'
import { threadRNG } from '@neat-evolution/utils'
import { describe, expect, it, vi } from 'vitest'
import { BanditEnvironment } from '../src/features/episodic/BanditEnvironment.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a deterministic executor that always returns the same outputs. */
function makeFixedExecutor(outputs: number[]): SyncExecutor {
  const result = Float64Array.from(outputs)
  return {
    isAsync: false as const,
    execute: () => result,
    executeBatch: (batch) => batch.map(() => result),
  }
}

/** Create a mock EpisodicAgent that tracks lifecycle calls. */
function makeMockAgent(
  chosenArm: number,
  armCount = 3
): {
  agent: EpisodicAgent
  calls: {
    startEpisode: number
    endEpisode: number
    act: number
    reward: Array<{ reward: number; done: boolean }>
    episodeResults: EpisodeResult[]
  }
} {
  const calls = {
    startEpisode: 0,
    endEpisode: 0,
    act: 0,
    reward: [] as Array<{ reward: number; done: boolean }>,
    episodeResults: [] as EpisodeResult[],
  }

  const action = new Float64Array(armCount)
  action[chosenArm] = 1

  const agent: EpisodicAgent = {
    act(_inputs: Float64Array): Float64Array {
      calls.act++
      return action
    },
    reward(reward: number, done: boolean): void {
      calls.reward.push({ reward, done })
    },
    startEpisode(_info): void {
      calls.startEpisode++
    },
    endEpisode(result): void {
      calls.endEpisode++
      calls.episodeResults.push(result)
    },
  }

  return { agent, calls }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BanditEnvironment', () => {
  describe('interface compliance', () => {
    it('passes isEpisodicEnvironment type guard', () => {
      const env = new BanditEnvironment()
      expect(isEpisodicEnvironment(env)).toBe(true)
    })

    it('passes isAgentEnvironment type guard', () => {
      const env = new BanditEnvironment()
      expect(isAgentEnvironment(env)).toBe(true)
    })

    it('has correct description', () => {
      const env = new BanditEnvironment()
      expect(env.description).toEqual({ inputs: 3, outputs: 3 })
    })

    it('allows custom output count', () => {
      const env = new BanditEnvironment(4)
      expect(env.description).toEqual({ inputs: 3, outputs: 4 })
    })
  })

  describe('getRLConfig', () => {
    it('returns correct action size', () => {
      const env = new BanditEnvironment()
      const config = env.getRLConfig()
      expect(config.actionSize).toBe(3)
    })

    it('returns discount factor of 0 (bandit is stateless)', () => {
      const env = new BanditEnvironment()
      const config = env.getRLConfig()
      expect(config.discountFactor).toBe(0)
    })

    it('suggests episode rollout length', () => {
      const env = new BanditEnvironment()
      const config = env.getRLConfig()
      expect(config.suggestedRolloutLength).toBe('episode')
    })

    it('has maxStepsPerEpisode of 20', () => {
      const env = new BanditEnvironment()
      const config = env.getRLConfig()
      expect(config.maxStepsPerEpisode).toBe(20)
    })
  })

  describe('evaluate (vanilla)', () => {
    it('returns fitness in [0, 1]', () => {
      const env = new BanditEnvironment()
      // Executor always picks arm 0
      const executor = makeFixedExecutor([1, 0, 0])
      const fitness = env.evaluate(executor)
      expect(fitness).toBeGreaterThanOrEqual(0)
      expect(fitness).toBeLessThanOrEqual(1)
    })

    it('returns ~0.33 when always picking arm 0 (only correct 1/3 of episodes)', () => {
      const env = new BanditEnvironment()
      // Arm 0 is best only in episode 0 → 20/60 correct
      const executor = makeFixedExecutor([1, 0, 0])
      const fitness = env.evaluate(executor)
      expect(fitness).toBeCloseTo(1 / 3, 5)
    })

    it('returns 1.0 for an oracle agent (always picks the best arm)', () => {
      const env = new BanditEnvironment()
      // We can't easily make a fixed executor pick different arms per episode,
      // but we can test evaluateAgent with a smart mock agent
      let episodeIndex = 0
      const agent: EpisodicAgent = {
        act(_inputs: Float64Array): Float64Array {
          const action = new Float64Array(3)
          action[episodeIndex] = 1
          return action
        },
        reward(): void {},
        startEpisode(info): void {
          episodeIndex = info.episodeIndex
        },
        endEpisode(): void {},
      }

      const fitness = env.evaluateAgent(agent)
      expect(fitness).toBe(1)
    })
  })

  describe('evaluateAgent', () => {
    it('calls startEpisode 3 times (one per episode)', () => {
      const env = new BanditEnvironment()
      const { agent, calls } = makeMockAgent(0)
      env.evaluateAgent(agent)
      expect(calls.startEpisode).toBe(3)
    })

    it('calls endEpisode 3 times', () => {
      const env = new BanditEnvironment()
      const { agent, calls } = makeMockAgent(0)
      env.evaluateAgent(agent)
      expect(calls.endEpisode).toBe(3)
    })

    it('calls act 60 times (3 episodes × 20 steps)', () => {
      const env = new BanditEnvironment()
      const { agent, calls } = makeMockAgent(0)
      env.evaluateAgent(agent)
      expect(calls.act).toBe(60)
    })

    it('calls reward 60 times', () => {
      const env = new BanditEnvironment()
      const { agent, calls } = makeMockAgent(0)
      env.evaluateAgent(agent)
      expect(calls.reward).toHaveLength(60)
    })

    it('sets done=true only on last step of each episode', () => {
      const env = new BanditEnvironment()
      const { agent, calls } = makeMockAgent(0)
      env.evaluateAgent(agent)

      // 3 episodes × 20 steps = 60 rewards
      // done=true on steps 19, 39, 59 (last step of each episode)
      const doneIndices = calls.reward
        .map((r, i) => (r.done ? i : -1))
        .filter((i) => i >= 0)
      expect(doneIndices).toEqual([19, 39, 59])
    })

    it('gives reward 1 when agent picks the correct arm', () => {
      const env = new BanditEnvironment()
      // Agent always picks arm 0 → correct only in episode 0
      const { agent, calls } = makeMockAgent(0)
      env.evaluateAgent(agent)

      // Episode 0 (steps 0-19): arm 0 is best → reward 1
      const episode0Rewards = calls.reward.slice(0, 20)
      for (const r of episode0Rewards) {
        expect(r.reward).toBe(1)
      }

      // Episode 1 (steps 20-39): arm 1 is best, agent picks 0 → reward 0
      const episode1Rewards = calls.reward.slice(20, 40)
      for (const r of episode1Rewards) {
        expect(r.reward).toBe(0)
      }
    })

    it('encodes episode index inside observations so policies can branch per episode', () => {
      const env = new BanditEnvironment()
      let activeEpisode = -1
      const agent: EpisodicAgent = {
        act(inputs: Float64Array): Float64Array {
          const expected = [0, 0, 0]
          if (activeEpisode >= 0) {
            expected[activeEpisode] = 1
          }
          expect(Array.from(inputs)).toEqual(expected)
          const action = new Float64Array(3)
          action[0] = 1
          return action
        },
        reward(): void {},
        startEpisode(info): void {
          activeEpisode = info.episodeIndex
        },
        endEpisode(): void {},
      }

      env.evaluateAgent(agent)
    })

    it('reports episodeReturn separately from per-episode fitness', () => {
      const env = new BanditEnvironment()
      const { agent, calls } = makeMockAgent(0)
      env.evaluateAgent(agent)

      expect(calls.episodeResults).toHaveLength(3)
      expect(calls.episodeResults[0]).toMatchObject({
        episodeReturn: 20,
        fitness: 1,
      })
      expect(calls.episodeResults[1]).toMatchObject({
        episodeReturn: 0,
        fitness: 0,
      })
      expect(calls.episodeResults[2]).toMatchObject({
        episodeReturn: 0,
        fitness: 0,
      })
    })
  })

  describe('createEpisodicAgent integration', () => {
    it('vanilla agent wraps executor correctly', () => {
      const executor = makeFixedExecutor([0.5, 0.8, 0.2])
      const agent = createEpisodicAgent(executor)

      const output = agent.act(new Float64Array([1, 0, 0]))
      expect(output).toBeInstanceOf(Float64Array)
      expect(output.length).toBe(3)
    })

    it('vanilla agent evaluates through BanditEnvironment', () => {
      const env = new BanditEnvironment()
      // Always pick arm 1 → correct in episode 1 only
      const executor = makeFixedExecutor([0, 1, 0])
      const fitness = env.evaluate(executor)
      expect(fitness).toBeCloseTo(1 / 3, 5)
    })
  })
})

describe('ACPlugin integration', () => {
  it('creates and evaluates with ACPlugin locally', async () => {
    // Minimal phenotype: 3 inputs → 4 outputs (3 actor Softmax + 1 critic Linear)
    const phenotype: Phenotype = {
      length: 7,
      inputs: [0, 1, 2],
      outputs: [3, 4, 5, 6],
      actions: [
        [PhenotypeActionType.Link, 0, 3, 0.5],
        [PhenotypeActionType.Link, 1, 4, 0.5],
        [PhenotypeActionType.Link, 2, 5, 0.5],
        [PhenotypeActionType.Link, 0, 6, 0.1],
        [PhenotypeActionType.Activation, 3, 0, Activation.Softmax],
        [PhenotypeActionType.Activation, 4, 0, Activation.Softmax],
        [PhenotypeActionType.Activation, 5, 0, Activation.Softmax],
        [PhenotypeActionType.Activation, 6, 0, Activation.Linear],
      ],
    }

    const { ACPlugin } = await import('@neat-evolution/actor-critic-plugin')
    const algorithm = {
      name: 'mock',
      pathname: '/mock',
      defaultOptions: {},
      usesCPPNActivations: false,
      enableCustomState: false,
      createConfig: vi.fn(),
      createGenome: vi.fn(),
      createPhenotype: vi.fn().mockReturnValue(phenotype),
      createState: vi.fn(),
      writeBackWeights: vi.fn(),
    }

    const env = new BanditEnvironment(4)
    const rng = () => Math.random()

    const plugin = new ACPlugin(
      algorithm,
      {
        learningRate: 0.01,
        isLamarckian: true,
        rolloutLength: 'episode',
        rewardThreshold: 0.1,
        discountFactor: 0,
      },
      rng
    )

    plugin.initialize({
      algorithm,
      environment: env,
    })

    const mockGenome = {} as AnyGenome
    const defaultEvaluate = vi.fn().mockResolvedValue(0.5)
    const evalContext = {
      evaluateGenomeEntry: vi.fn(),
      evaluateGenomeEntryBatch: vi.fn(),
      send: vi.fn(),
      call: vi.fn(),
      broadcast: vi.fn(),
      addMessageHandler: vi.fn(),
      removeMessageHandler: vi.fn(),
    }

    const result = await plugin.evaluateGenome(
      mockGenome,
      defaultEvaluate,
      evalContext as never
    )

    // Should use local evaluation (evaluateAgent), not defaultEvaluate
    expect(defaultEvaluate).not.toHaveBeenCalled()
    expect(result.fitness).toBeGreaterThanOrEqual(0)
    expect(result.fitness).toBeLessThanOrEqual(1)

    // Lamarckian writeback should be in the result
    expect(result.updatedActions).toBeDefined()
    expect(result.updatedActions).toEqual(expect.any(Array))
  })
})

describe('QLPlugin integration', () => {
  it('creates and evaluates with QLPlugin locally', async () => {
    // Minimal phenotype: 3 inputs → 3 outputs (Q-values)
    const phenotype: Phenotype = {
      length: 6,
      inputs: [0, 1, 2],
      outputs: [3, 4, 5],
      actions: [
        [PhenotypeActionType.Link, 0, 3, 0.5],
        [PhenotypeActionType.Link, 1, 4, 0.5],
        [PhenotypeActionType.Link, 2, 5, 0.5],
        [PhenotypeActionType.Activation, 3, 0, Activation.Sigmoid],
        [PhenotypeActionType.Activation, 4, 0, Activation.Sigmoid],
        [PhenotypeActionType.Activation, 5, 0, Activation.Sigmoid],
      ],
    }

    const { QLPlugin } = await import('@neat-evolution/q-learning-plugin')
    const algorithm = {
      name: 'mock',
      pathname: '/mock',
      defaultOptions: {},
      usesCPPNActivations: false,
      enableCustomState: false,
      createConfig: vi.fn(),
      createGenome: vi.fn(),
      createPhenotype: vi.fn().mockReturnValue(phenotype),
      createState: vi.fn(),
      writeBackWeights: vi.fn(),
    }

    const env = new BanditEnvironment(3)
    const rng = threadRNG()

    const plugin = new QLPlugin(
      algorithm,
      {
        learningRate: 0.01,
        epsilonInitial: 0.3,
        epsilonDecayPerEpisode: 0.95,
        epsilonMinimum: 0.01,
        isLamarckian: true,
        rolloutLength: 'episode',
        rewardThreshold: 0.1,
        discountFactor: 0,
      },
      rng
    )

    plugin.initialize({
      algorithm,
      environment: env,
    })

    const mockGenome = {} as AnyGenome
    const defaultEvaluate = vi.fn().mockResolvedValue(0.5)
    const evalContext = {
      evaluateGenomeEntry: vi.fn(),
      evaluateGenomeEntryBatch: vi.fn(),
      send: vi.fn(),
      call: vi.fn(),
      broadcast: vi.fn(),
      addMessageHandler: vi.fn(),
      removeMessageHandler: vi.fn(),
    }

    const result = await plugin.evaluateGenome(
      mockGenome,
      defaultEvaluate,
      evalContext as never
    )

    // Should use local evaluation (evaluateAgent), not defaultEvaluate
    expect(defaultEvaluate).not.toHaveBeenCalled()
    expect(result.fitness).toBeGreaterThanOrEqual(0)
    expect(result.fitness).toBeLessThanOrEqual(1)

    // Lamarckian writeback should be in the result
    expect(result.updatedActions).toBeDefined()
    expect(result.updatedActions).toEqual(expect.any(Array))
  })
})
