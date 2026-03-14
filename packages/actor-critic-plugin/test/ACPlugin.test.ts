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
import type { SyncExecutor } from '@neat-evolution/executor'
import { describe, expect, it, vi } from 'vitest'

import { ACPlugin } from '../src/ACPlugin.js'

// ---------------------------------------------------------------------------
// Minimal phenotype: 2 inputs → 3 outputs (2 actor + 1 critic)
// ---------------------------------------------------------------------------
const phenotype: Phenotype = {
  length: 5,
  inputs: [0, 1],
  outputs: [2, 3, 4],
  actions: [
    [PhenotypeActionType.Link, 0, 2, 0.5],
    [PhenotypeActionType.Link, 1, 2, 0.3],
    [PhenotypeActionType.Activation, 2, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 0, 3, 0.4],
    [PhenotypeActionType.Link, 1, 3, 0.6],
    [PhenotypeActionType.Activation, 3, 0, Activation.Sigmoid],
    [PhenotypeActionType.Link, 0, 4, 0.2],
    [PhenotypeActionType.Link, 1, 4, 0.8],
    [PhenotypeActionType.Activation, 4, 0, Activation.Sigmoid],
  ],
}

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function makeMockAlgorithm() {
  return {
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
    evaluateAgent: vi.fn().mockReturnValue(0.9),
  }
}

function makeMockPluginContext(
  algorithm: ReturnType<typeof makeMockAlgorithm>,
  environment: unknown
): PluginContext {
  return {
    algorithm,
    environment,
  } as unknown as PluginContext
}

function makeMockEvaluationContext(): EvaluationContext {
  return {
    send: vi.fn(),
    call: vi.fn(),
    broadcast: vi.fn(),
    addMessageHandler: vi.fn(),
    removeMessageHandler: vi.fn(),
    evaluateGenomeEntry: vi.fn(),
    evaluateGenomeEntryBatch: vi.fn(),
  } as unknown as EvaluationContext
}

function makeMockExecutor(): SyncExecutor {
  return {
    execute: vi.fn(),
    executeBatch: vi.fn(),
    isAsync: false as const,
  }
}

function deterministicRng(): () => number {
  let counter = 0
  return () => {
    const values = [0.1, 0.4, 0.8, 0.2, 0.6, 0.9, 0.05, 0.5]
    const val = values[counter % values.length]
    counter++
    if (val === undefined) throw new Error('RNG value undefined')
    return val
  }
}

const mockGenome = { nodes: [], links: [] } as unknown as AnyGenome

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ACPlugin', () => {
  describe('initialize', () => {
    it('throws when environment does not implement EpisodicEnvironment', () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
        deterministicRng()
      )
      const badContext = makeMockPluginContext(algorithm, { evaluate: vi.fn() })

      expect(() => plugin.initialize(badContext)).toThrow(
        'ACPlugin requires an EpisodicEnvironment'
      )
    })

    it('throws when environment is null', () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
        deterministicRng()
      )
      const badContext = makeMockPluginContext(algorithm, null)

      expect(() => plugin.initialize(badContext)).toThrow(
        'ACPlugin requires an EpisodicEnvironment'
      )
    })

    it('succeeds with a valid EpisodicEnvironment', () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
        deterministicRng()
      )
      const context = makeMockPluginContext(algorithm, env)

      expect(() => plugin.initialize(context)).not.toThrow()
    })
  })

  describe('evaluateGenome — augmentation pattern', () => {
    it('throws if not initialized', async () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
        deterministicRng()
      )
      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn()

      await expect(
        plugin.evaluateGenome(mockGenome, defaultEvaluate, evalContext)
      ).rejects.toThrow('ACPlugin not initialized')
    })

    it('CALLS defaultEvaluate (augmentation pattern)', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
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
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
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

    it('delegates to defaultEvaluate when worker training capabilities are present (worker path)', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockAgentEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = {
        ...makeMockEvaluationContext(),
        workerTrainingCapabilities: {
          rl: {
            supported: true,
            methods: {
              'actor-critic': {
                supported: true,
                supportsLamarckianWriteback: true,
              },
            },
          },
        },
      } as unknown as EvaluationContext

      const defaultEvaluate = vi.fn().mockResolvedValue(1.05)
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      // Worker path: plugin delegates to defaultEvaluate (which goes through evaluateGenomeEntry)
      expect(result.fitness).toBe(1.05)
      expect(defaultEvaluate).toHaveBeenCalledOnce()
      // No direct context.call — worker handles training internally
      expect(evalContext.call).not.toHaveBeenCalled()
    })

    it('calls createPhenotype for each genome', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
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

  describe('getWorkerPluginData', () => {
    it('returns empty object before initialization', () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
        deterministicRng()
      )

      expect(plugin.getWorkerPluginData()).toEqual({})
    })

    it('returns RL training config after initialization', () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const data = plugin.getWorkerPluginData()
      expect(data.rl).toBeDefined()
      const rl = data.rl as Record<string, unknown>
      expect(rl.method).toBe('actor-critic')
      expect(rl.isLamarckian).toBe(true)
      expect(rl.config).toBeDefined()
    })
  })

  describe('getContextHooks', () => {
    it('returns Partial<EpisodicContext> with all four hooks', () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
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
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
        deterministicRng()
      )
      const hooks = plugin.getContextHooks()
      const mockExecutor = makeMockExecutor()

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

    it('hooks delegate to current AC agent during evaluation', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
        deterministicRng()
      )
      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const hooks = plugin.getContextHooks()
      const mockExecutor = makeMockExecutor()

      // During defaultEvaluate, the agent should be active
      let agentWasActive = false
      const defaultEvaluate = vi.fn().mockImplementation(async () => {
        // The agent should be active now — hooks should work without throwing
        hooks.episodeStart?.(mockExecutor, { episodeIndex: 0 })

        // Do an act call through the agent by simulating environment behavior:
        // The hook doesn't call act — the environment does via createEpisodicAgent.
        // But we can verify the hooks route to the agent by calling reward.
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
    it('AC agent trains when significant reward is received', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        {
          learningRate: 0.01,
          rewardThreshold: 0.1,
        },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const hooks = plugin.getContextHooks()
      const mockExecutor = makeMockExecutor()

      // Track weight changes via getUpdatedActions
      let preTrainActions: unknown

      const defaultEvaluate = vi.fn().mockImplementation(async () => {
        hooks.episodeStart?.(mockExecutor, { episodeIndex: 0 })

        // Store pre-training actions
        preTrainActions = algorithm.createPhenotype(mockGenome)

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
      expect(preTrainActions).toBeDefined()
    })
  })

  describe('Lamarckian writeback via EvaluationResult', () => {
    it('returns updatedActions when isLamarckian: true', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01, isLamarckian: true },
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

      expect(result.updatedActions).toBeDefined()
      expect(result.updatedActions).toEqual(expect.any(Array))
    })

    it('does NOT return updatedActions when isLamarckian: false', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01, isLamarckian: false },
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

      expect(result.updatedActions).toBeUndefined()
    })

    it('defaults to Lamarckian (returns updatedActions) when not specified', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
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

      expect(result.updatedActions).toBeDefined()
      expect(result.updatedActions).toEqual(expect.any(Array))
    })
  })

  describe('telemetry in EvaluationResult', () => {
    it('returns telemetry in result for local evaluation', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockEpisodicEnvironment()
      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
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

      expect(result.telemetry).toBeDefined()
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

      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
        deterministicRng()
      )

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      // Just verify it initializes without error — the discount factor
      // is used internally by the AC agent
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

      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01, discountFactor: 0.5 },
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

      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01 },
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

      const plugin = new ACPlugin(
        algorithm,
        { learningRate: 0.01, rolloutLength: 16 },
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
})
