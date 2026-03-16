import { isEpisodicEnvironment } from '@neat-evolution/environment'
import {
  createEpisodicAgent,
  type EpisodeResult,
  type EpisodicAgent,
} from '@neat-evolution/execution-manager'
import type { StaticExecutor } from '@neat-evolution/executor'
import { describe, expect, it } from 'vitest'
import { BanditEnvironment } from '../src/features/episodic/BanditEnvironment.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a deterministic executor that always returns the same outputs. */
function makeFixedExecutor(outputs: number[]): StaticExecutor {
  const result = Float64Array.from(outputs)
  return {
    forward: () => result,
    forwardBatch: (batch) => batch.map(() => result),
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
    reward: Array<{ reward: number; terminated: boolean; truncated: boolean }>
    episodeResults: EpisodeResult[]
  }
} {
  const calls = {
    startEpisode: 0,
    endEpisode: 0,
    act: 0,
    reward: [] as Array<{
      reward: number
      terminated: boolean
      truncated: boolean
    }>,
    episodeResults: [] as EpisodeResult[],
  }

  const action = new Float64Array(armCount)
  action[chosenArm] = 1

  const agent: EpisodicAgent = {
    act(_inputs: Float64Array): Float64Array {
      calls.act++
      return action
    },
    reward(reward: number, terminated: boolean, truncated: boolean): void {
      calls.reward.push({ reward, terminated, truncated })
    },
    setTransitionInfo(): void {},
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
        reward(_r: number, _t: boolean, _tr: boolean): void {},
        setTransitionInfo(): void {},
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

    it('sets truncated=true only on last step of each episode', () => {
      const env = new BanditEnvironment()
      const { agent, calls } = makeMockAgent(0)
      env.evaluateAgent(agent)

      // 3 episodes × 20 steps = 60 rewards
      // truncated=true on steps 19, 39, 59 (last step of each episode)
      const truncatedIndices = calls.reward
        .map((r, i) => (r.truncated ? i : -1))
        .filter((i) => i >= 0)
      expect(truncatedIndices).toEqual([19, 39, 59])
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
        reward(_r: number, _t: boolean, _tr: boolean): void {},
        setTransitionInfo(): void {},
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
