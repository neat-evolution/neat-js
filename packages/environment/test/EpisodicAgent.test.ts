import type { StaticExecutor } from '@neat-evolution/executor'
import { describe, expect, test, vi } from 'vitest'
import type { EpisodeInfo, EpisodeResult } from '../src/EpisodicAgent.js'
import { createEpisodicAgent } from '../src/EpisodicAgent.js'
import type { EpisodicContext } from '../src/EpisodicContext.js'

const mockExecutor: StaticExecutor = {
  forward: (input) => Float64Array.from(input as Float64Array),
  forwardBatch: (batch) =>
    batch.map((input) => Float64Array.from(input as Float64Array)),
}

const episodeInfo: EpisodeInfo = {
  episodeIndex: 0,
  type: 'scenario',
  metadata: { seed: 42 },
}

const episodeResult: EpisodeResult = {
  fitness: 0.85,
  episodeReturn: 17.5,
  totalSteps: 100,
  terminated: false,
}

describe('createEpisodicAgent', () => {
  describe('vanilla agent (no context)', () => {
    test('creates a vanilla agent', () => {
      const agent = createEpisodicAgent(mockExecutor)
      expect(agent).toBeDefined()
      expect(typeof agent.act).toBe('function')
      expect(typeof agent.reward).toBe('function')
      expect(typeof agent.startEpisode).toBe('function')
      expect(typeof agent.endEpisode).toBe('function')
    })

    test('act() delegates to executor.forward()', () => {
      const agent = createEpisodicAgent(mockExecutor)
      const inputs = new Float64Array([1.0, 2.0, 3.0])
      const output = agent.act(inputs)
      expect(output).toBeInstanceOf(Float64Array)
      expect(Array.from(output)).toEqual([1.0, 2.0, 3.0])
    })

    test('act() converts number[] output to Float64Array', () => {
      const arrayExecutor: StaticExecutor = {
        forward: () => [1.0, 2.0],
        forwardBatch: () => [[1.0, 2.0]],
      }
      const agent = createEpisodicAgent(arrayExecutor)
      const output = agent.act(new Float64Array([0.5]))
      expect(output).toBeInstanceOf(Float64Array)
      expect(Array.from(output)).toEqual([1.0, 2.0])
    })

    test('reward() is a no-op', () => {
      const agent = createEpisodicAgent(mockExecutor)
      expect(() => agent.reward(1.0, false)).not.toThrow()
    })

    test('startEpisode() is a no-op', () => {
      const agent = createEpisodicAgent(mockExecutor)
      expect(() => agent.startEpisode(episodeInfo)).not.toThrow()
    })

    test('endEpisode() is a no-op', () => {
      const agent = createEpisodicAgent(mockExecutor)
      expect(() => agent.endEpisode(episodeResult)).not.toThrow()
    })
  })

  describe('context agent', () => {
    test('fires context.reward() when reward() is called', () => {
      const context: EpisodicContext = {
        reward: vi.fn(),
      }
      const agent = createEpisodicAgent(mockExecutor, context)
      agent.reward(0.5, false)
      expect(context.reward).toHaveBeenCalledWith(mockExecutor, 0.5, false)
    })

    test('fires context.episodeStart() when startEpisode() is called', () => {
      const context: EpisodicContext = {
        episodeStart: vi.fn(),
      }
      const agent = createEpisodicAgent(mockExecutor, context)
      agent.startEpisode(episodeInfo)
      expect(context.episodeStart).toHaveBeenCalledWith(
        mockExecutor,
        episodeInfo
      )
    })

    test('fires context.episodeEnd() when endEpisode() is called', () => {
      const context: EpisodicContext = {
        episodeEnd: vi.fn(),
      }
      const agent = createEpisodicAgent(mockExecutor, context)
      agent.endEpisode(episodeResult)
      expect(context.episodeEnd).toHaveBeenCalledWith(
        mockExecutor,
        episodeResult
      )
    })

    test('handles partial context (only some hooks provided)', () => {
      const context: EpisodicContext = {
        reward: vi.fn(),
        // episodeStart and episodeEnd not provided
      }
      const agent = createEpisodicAgent(mockExecutor, context)
      // These should not throw even though hooks are missing
      expect(() => agent.startEpisode(episodeInfo)).not.toThrow()
      expect(() => agent.endEpisode(episodeResult)).not.toThrow()
      // reward should still fire
      agent.reward(1.0, true)
      expect(context.reward).toHaveBeenCalledWith(mockExecutor, 1.0, true)
    })

    test('context agent act() still delegates to executor', () => {
      const context: EpisodicContext = {
        reward: vi.fn(),
      }
      const agent = createEpisodicAgent(mockExecutor, context)
      const inputs = new Float64Array([1.0, 2.0])
      const output = agent.act(inputs)
      expect(output).toBeInstanceOf(Float64Array)
      expect(Array.from(output)).toEqual([1.0, 2.0])
    })
  })
})
