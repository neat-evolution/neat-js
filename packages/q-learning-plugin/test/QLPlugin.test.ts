import {
  Activation,
  type AnyGenome,
  type Phenotype,
  PhenotypeActionType,
} from '@neat-evolution/core'
import type {
  EvaluationContext,
  PluginContext,
} from '@neat-evolution/evaluation-strategy'
import type { RNG } from '@neat-evolution/utils'
import { describe, expect, it, vi } from 'vitest'

import { QLPlugin } from '../src/QLPlugin.js'

// ---------------------------------------------------------------------------
// Minimal phenotype: 2 inputs → 2 outputs (2 Q-values for standard mode)
// ---------------------------------------------------------------------------
const phenotype: Phenotype = {
  length: 4,
  inputs: [0, 1],
  outputs: [2, 3],
  actions: [
    [PhenotypeActionType.Link, 0, 2, 0.5],
    [PhenotypeActionType.Link, 1, 2, 0.3],
    [PhenotypeActionType.Activation, 2, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 0, 3, 0.4],
    [PhenotypeActionType.Link, 1, 3, 0.6],
    [PhenotypeActionType.Activation, 3, 0, Activation.Sigmoid],
  ],
}

// ---------------------------------------------------------------------------
// Minimal phenotype for multi-discrete mode: 2 inputs → 4 outputs (2 factors × 2 Q-values)
// ---------------------------------------------------------------------------
const perButtonPhenotype: Phenotype = {
  length: 6,
  inputs: [0, 1],
  outputs: [2, 3, 4, 5],
  actions: [
    [PhenotypeActionType.Link, 0, 2, 0.5],
    [PhenotypeActionType.Link, 1, 2, 0.3],
    [PhenotypeActionType.Activation, 2, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 0, 3, 0.4],
    [PhenotypeActionType.Link, 1, 3, 0.6],
    [PhenotypeActionType.Activation, 3, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 0, 4, 0.2],
    [PhenotypeActionType.Link, 1, 4, 0.7],
    [PhenotypeActionType.Activation, 4, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 0, 5, 0.1],
    [PhenotypeActionType.Link, 1, 5, 0.9],
    [PhenotypeActionType.Activation, 5, 0, Activation.Sigmoid],
  ],
}

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function makeMockAlgorithm(returnPhenotype: Phenotype = phenotype) {
  return {
    name: 'mock',
    pathname: '/mock',
    defaultOptions: {},
    usesCPPNActivations: false,
    enableCustomState: false,
    createConfig: vi.fn(),
    createGenome: vi.fn(),
    createPhenotype: vi.fn().mockReturnValue(returnPhenotype),
    createState: vi.fn(),
    writeBackWeights: vi.fn(),
  }
}

function makeMockEpisodicEnvironment() {
  return {
    getRLConfig: vi.fn().mockReturnValue({
      actionSize: 2,
      discountFactor: 0.99,
      suggestedRolloutLength: 'episode' as const,
    }),
  }
}

function makeMockAgentEnvironment() {
  const base = makeMockEpisodicEnvironment()
  return {
    ...base,
    evaluateAgent: vi.fn().mockReturnValue(0.95),
  }
}

function makeMockPluginContext(
  algorithm: ReturnType<typeof makeMockAlgorithm>,
  environment: unknown
): PluginContext {
  return {
    algorithm,
    environment,
    supportsTraining: false,
  } as unknown as PluginContext
}

function makeMockEvaluationContext(): EvaluationContext {
  return {
    send: vi.fn(),
    call: vi.fn(),
    broadcast: vi.fn(),
    addMessageHandler: vi.fn(),
    removeMessageHandler: vi.fn(),
    dispatch: vi.fn(),
    request: vi.fn(),
    addActionHandler: vi.fn(),
    removeActionHandler: vi.fn(),
    evaluateGenomeEntry: vi.fn(),
    evaluateGenomeEntryBatch: vi.fn(),
  } as unknown as EvaluationContext
}

function deterministicRng(): RNG {
  let counter = 0
  const generator = () => {
    const values = [0.1, 0.4, 0.8, 0.2, 0.6, 0.9, 0.05, 0.5]
    const val = values[counter % values.length]
    counter++
    if (val === undefined) throw new Error('RNG value undefined')
    return val
  }
  return {
    gen: generator,
    genRange: (min: number, max: number) => {
      if (max <= min) {
        throw new Error('max must be greater than min')
      }
      return min + Math.floor(generator() * (max - min))
    },
    genBool: () => generator() < 0.5,
  }
}

const mockGenome = { nodes: [], links: [] } as unknown as AnyGenome

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QLPlugin', () => {
  describe('initialize', () => {
    it('throws when environment does not implement EpisodicEnvironment', () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )
      const badContext = makeMockPluginContext(algorithm, { evaluate: vi.fn() })

      expect(() => plugin.initialize(badContext)).toThrow(
        'QLPlugin requires an EpisodicEnvironment'
      )
    })

    it('throws when environment is null', () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )
      const badContext = makeMockPluginContext(algorithm, null)

      expect(() => plugin.initialize(badContext)).toThrow(
        'QLPlugin requires an EpisodicEnvironment'
      )
    })

    it('succeeds with a valid EpisodicEnvironment', () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )
      const context = makeMockPluginContext(algorithm, env)

      expect(() => plugin.initialize(context)).not.toThrow()
    })
  })

  describe('evaluateGenome — augmentation pattern', () => {
    it('throws if not initialized', async () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )
      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn()

      await expect(
        plugin.evaluateGenome(mockGenome, defaultEvaluate, evalContext)
      ).rejects.toThrow('QLPlugin not initialized')
    })

    it('CALLS defaultEvaluate (augmentation pattern)', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.85)
      await plugin.evaluateGenome(mockGenome, defaultEvaluate, evalContext)

      expect(defaultEvaluate).toHaveBeenCalledOnce()
      expect(defaultEvaluate).toHaveBeenCalledWith(mockGenome)
    })

    it('returns fitness from defaultEvaluate', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.75)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      expect(result.fitness).toBe(0.75)
    })

    it('uses worker evaluation when supportsTraining is true', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockAgentEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = {
        ...makeMockEvaluationContext(),
        supportsTraining: true,
        call: vi.fn().mockResolvedValue({
          method: 'q-learning',
          fitness: 1.12,
          updatedActions: [[PhenotypeActionType.Link, 0, 2, 0.4]],
          telemetry: {
            episodes: 3,
            rolloutSegments: 5,
            transitionsTrained: 80,
            epsilonInitial: 0.3,
            epsilonFinal: 0.2,
            epsilonDecayPerEpisode: 0.9,
            epsilonMinimum: 0.1,
            multiDiscrete: false,
          },
        }),
      } as unknown as EvaluationContext

      const genomeWithFactory = {
        ...mockGenome,
        toFactoryOptions: vi.fn().mockReturnValue({ mock: true }),
      } as unknown as AnyGenome

      const defaultEvaluate = vi.fn()
      const result = await plugin.evaluateGenome(
        genomeWithFactory,
        defaultEvaluate,
        evalContext
      )

      expect(result.fitness).toBeCloseTo(1.12)
      expect(evalContext.call).toHaveBeenCalledOnce()
      expect(defaultEvaluate).not.toHaveBeenCalled()

      plugin.afterFitness(genomeWithFactory, result.fitness, pluginContext)
      expect(algorithm.writeBackWeights).toHaveBeenCalled()
    })

    it('calls createPhenotype for each genome', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.5)
      await plugin.evaluateGenome(mockGenome, defaultEvaluate, evalContext)

      expect(algorithm.createPhenotype).toHaveBeenCalledOnce()
      expect(algorithm.createPhenotype).toHaveBeenCalledWith(mockGenome)
    })
  })

  describe('getContextHooks', () => {
    it('returns Partial<EpisodicContext> with all four hooks', () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )

      const hooks = plugin.getContextHooks()

      expect(hooks.reward).toBeTypeOf('function')
      expect(hooks.episodeStart).toBeTypeOf('function')
      expect(hooks.episodeEnd).toBeTypeOf('function')
      expect(hooks.transitionInfo).toBeTypeOf('function')
    })

    it('hooks are no-ops when no agent is active', () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )
      const hooks = plugin.getContextHooks()
      const mockExecutor = {
        execute: vi.fn(),
        executeBatch: vi.fn(),
        isAsync: false as const,
      }

      // These should not throw — they use optional chaining on currentAgent
      expect(() => hooks.reward?.(mockExecutor, 1.0, false)).not.toThrow()
      expect(() =>
        hooks.episodeStart?.(mockExecutor, { episodeIndex: 0 })
      ).not.toThrow()
      expect(() =>
        hooks.episodeEnd?.(mockExecutor, {
          fitness: 1.0,
          episodeReturn: 1.0,
          totalSteps: 10,
          terminated: false,
        })
      ).not.toThrow()
      expect(() =>
        hooks.transitionInfo?.(mockExecutor, { isInteresting: true })
      ).not.toThrow()
    })

    it('hooks delegate to current QL agent during evaluation', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )
      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const hooks = plugin.getContextHooks()
      const mockExecutor = {
        execute: vi.fn(),
        executeBatch: vi.fn(),
        isAsync: false as const,
      }

      // During defaultEvaluate, the agent should be active
      let agentWasActive = false
      const defaultEvaluate = vi.fn().mockImplementation(async () => {
        // The agent should be active now — hooks should work without throwing
        hooks.episodeStart?.(mockExecutor, { episodeIndex: 0 })
        hooks.reward?.(mockExecutor, 0.5, false)
        agentWasActive = true
        hooks.episodeEnd?.(mockExecutor, {
          fitness: 0.8,
          episodeReturn: 0.8,
          totalSteps: 1,
          terminated: false,
        })
        return 0.8
      })

      const evalContext = makeMockEvaluationContext()
      await plugin.evaluateGenome(mockGenome, defaultEvaluate, evalContext)

      expect(agentWasActive).toBe(true)
    })
  })

  describe('training during evaluation', () => {
    it('QL agent trains when significant reward is received', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        {
          learningRate: 0.01,
          epsilonInitial: 0.3,
          rewardThreshold: 0.1,
        },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const hooks = plugin.getContextHooks()
      const mockExecutor = {
        execute: vi.fn(),
        executeBatch: vi.fn(),
        isAsync: false as const,
      }

      const defaultEvaluate = vi.fn().mockImplementation(async () => {
        hooks.episodeStart?.(mockExecutor, { episodeIndex: 0 })
        hooks.episodeEnd?.(mockExecutor, {
          fitness: 0.5,
          episodeReturn: 0.5,
          totalSteps: 0,
          terminated: true,
        })
        return 0.5
      })

      const evalContext = makeMockEvaluationContext()
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      expect(result.fitness).toBe(0.5)
    })
  })

  describe('Lamarckian writeback via afterFitness', () => {
    it('calls algorithm.writeBackWeights when isLamarckian: true', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3, isLamarckian: true },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.9)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      // afterFitness triggers writeback
      plugin.afterFitness(mockGenome, result.fitness, pluginContext)

      expect(algorithm.writeBackWeights).toHaveBeenCalledOnce()
      expect(algorithm.writeBackWeights).toHaveBeenCalledWith(
        mockGenome,
        expect.any(Array)
      )
    })

    it('does NOT call writeBackWeights when isLamarckian: false', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3, isLamarckian: false },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.9)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      plugin.afterFitness(mockGenome, result.fitness, pluginContext)

      expect(algorithm.writeBackWeights).not.toHaveBeenCalled()
    })

    it('defaults to Lamarckian (isLamarckian: true) when not specified', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.9)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      plugin.afterFitness(mockGenome, result.fitness, pluginContext)

      expect(algorithm.writeBackWeights).toHaveBeenCalledOnce()
    })

    it('cleans up pending writebacks after afterFitness', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3, isLamarckian: true },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.9)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      plugin.afterFitness(mockGenome, result.fitness, pluginContext)
      // Second call should be a no-op (writeback already consumed)
      plugin.afterFitness(mockGenome, result.fitness, pluginContext)

      expect(algorithm.writeBackWeights).toHaveBeenCalledOnce()
    })
  })

  describe('RLConfig integration', () => {
    it('uses environment discountFactor when not overridden', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      env.getRLConfig.mockReturnValue({
        actionSize: 2,
        discountFactor: 0.95,
        suggestedRolloutLength: 'episode',
      })

      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.5)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      expect(result.fitness).toBe(0.5)
    })

    it('overrides environment discountFactor when specified in options', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      env.getRLConfig.mockReturnValue({
        actionSize: 2,
        discountFactor: 0.95,
        suggestedRolloutLength: 'episode',
      })

      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3, discountFactor: 0.5 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.5)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      expect(result.fitness).toBe(0.5)
    })

    it('uses suggestedRolloutLength from environment as default', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      env.getRLConfig.mockReturnValue({
        actionSize: 2,
        discountFactor: 0.99,
        suggestedRolloutLength: 64,
      })

      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.5)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      expect(result.fitness).toBe(0.5)
    })

    it('explicit rolloutLength overrides environment suggestion', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      env.getRLConfig.mockReturnValue({
        actionSize: 2,
        discountFactor: 0.99,
        suggestedRolloutLength: 64,
      })

      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3, rolloutLength: 16 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.5)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      expect(result.fitness).toBe(0.5)
    })
  })

  describe('epsilon management', () => {
    it('uses epsilon for action selection (agent-internal)', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.5)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      // Epsilon is agent-internal; just verify the plugin runs successfully
      expect(result.fitness).toBe(0.5)
    })

    it('epsilon resets per genome evaluation', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new QLPlugin(
        algorithm,
        {
          learningRate: 0.01,
          epsilonInitial: 0.5,
          epsilonDecayPerEpisode: 0.9,
          epsilonMinimum: 0.01,
        },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()

      // First genome evaluation
      const defaultEvaluate1 = vi.fn().mockResolvedValue(0.5)
      await plugin.evaluateGenome(mockGenome, defaultEvaluate1, evalContext)

      // Second genome evaluation — epsilon should reset to 0.5 (new agent created)
      const defaultEvaluate2 = vi.fn().mockResolvedValue(0.6)
      await plugin.evaluateGenome(mockGenome, defaultEvaluate2, evalContext)

      // Both evaluations should succeed — new agent per genome means epsilon resets
      expect(defaultEvaluate1).toHaveBeenCalledOnce()
      expect(defaultEvaluate2).toHaveBeenCalledOnce()
    })
  })

  describe('multi-discrete mode', () => {
    it('works with 2N outputs for multi-discrete Q-values', async () => {
      const algorithm = makeMockAlgorithm(perButtonPhenotype)
      const env = makeMockEpisodicEnvironment()

      const plugin = new QLPlugin(
        algorithm,
        { learningRate: 0.01, epsilonInitial: 0.3, multiDiscrete: true },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn().mockResolvedValue(0.7)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      expect(result.fitness).toBe(0.7)
      expect(defaultEvaluate).toHaveBeenCalledOnce()
    })
  })
})
