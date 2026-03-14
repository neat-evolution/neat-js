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
import { describe, expect, it, vi } from 'vitest'

import { BackpropPlugin } from '../src/BackpropPlugin.js'

// ---------------------------------------------------------------------------
// Minimal phenotype: 2 inputs (nodes 0,1) → 1 output (node 2)
// ---------------------------------------------------------------------------
const phenotype: Phenotype = {
  length: 3,
  inputs: [0, 1],
  outputs: [2],
  actions: [
    [PhenotypeActionType.Link, 0, 2, 0.5], // input0 -> output
    [PhenotypeActionType.Link, 1, 2, 0.5], // input1 -> output
    [PhenotypeActionType.Activation, 2, 0, Activation.Sigmoid], // output
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

function makeMockSupervisedEnvironment(fitnessValue = 0.9) {
  const trainingData = {
    inputs: [
      [0, 0],
      [1, 1],
    ] as number[][],
    targets: [[0], [1]] as number[][],
    count: 2,
  }
  const validationData = {
    inputs: [[0, 1]] as number[][],
    targets: [[1]] as number[][],
    count: 1,
  }
  return {
    getTrainingData: vi.fn().mockReturnValue(trainingData),
    getValidationData: vi.fn().mockReturnValue(validationData),
    getLossConfig: vi.fn().mockReturnValue({
      isClassification: false,
      oneHotOutput: false,
    }),
    computeFitness: vi.fn().mockReturnValue(fitnessValue),
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

// A trivial genome object — BackpropPlugin treats it opaquely.
const mockGenome = { nodes: [], links: [] } as unknown as AnyGenome

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BackpropPlugin', () => {
  describe('initialize', () => {
    it('throws when environment does not implement SupervisedEnvironment', () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new BackpropPlugin(algorithm)
      const badContext = makeMockPluginContext(algorithm, { evaluate: vi.fn() })

      expect(() => plugin.initialize(badContext)).toThrow(
        'BackpropPlugin requires an environment that implements SupervisedEnvironment'
      )
    })

    it('throws when environment is null', () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new BackpropPlugin(algorithm)
      const badContext = makeMockPluginContext(algorithm, null)

      expect(() => plugin.initialize(badContext)).toThrow(
        'BackpropPlugin requires an environment that implements SupervisedEnvironment'
      )
    })

    it('succeeds with a valid SupervisedEnvironment', () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const plugin = new BackpropPlugin(algorithm)
      const context = makeMockPluginContext(algorithm, env)

      expect(() => plugin.initialize(context)).not.toThrow()
    })
  })

  describe('evaluateGenome — local path', () => {
    it('throws if not initialized', async () => {
      const algorithm = makeMockAlgorithm()
      const plugin = new BackpropPlugin(algorithm, { trainingEpochs: 1 })
      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn()

      await expect(
        plugin.evaluateGenome(mockGenome, defaultEvaluate, evalContext)
      ).rejects.toThrow('BackpropPlugin not initialized')
    })

    it('returns fitness from validation data', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment(0.75)
      const plugin = new BackpropPlugin(algorithm, { trainingEpochs: 1 })

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn()
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      expect(result.fitness).toBe(0.75)
      expect(env.getValidationData).toHaveBeenCalled()
      expect(env.computeFitness).toHaveBeenCalledOnce()
    })

    it('does NOT call defaultEvaluate (replacement pattern)', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const plugin = new BackpropPlugin(algorithm, { trainingEpochs: 1 })

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn()
      await plugin.evaluateGenome(mockGenome, defaultEvaluate, evalContext)

      expect(defaultEvaluate).not.toHaveBeenCalled()
    })

    it('trains on training data', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const plugin = new BackpropPlugin(algorithm, { trainingEpochs: 3 })

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn()
      await plugin.evaluateGenome(mockGenome, defaultEvaluate, evalContext)

      expect(env.getTrainingData).toHaveBeenCalledOnce()
      expect(env.getValidationData).toHaveBeenCalledOnce()
    })

    it('calls createPhenotype for each genome', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const plugin = new BackpropPlugin(algorithm, { trainingEpochs: 1 })

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn()

      await plugin.evaluateGenome(mockGenome, defaultEvaluate, evalContext)

      expect(algorithm.createPhenotype).toHaveBeenCalledOnce()
      expect(algorithm.createPhenotype).toHaveBeenCalledWith(mockGenome)
    })
  })

  describe('Lamarckian writeback via EvaluationResult', () => {
    it('returns updatedActions when isLamarckian: true', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const plugin = new BackpropPlugin(algorithm, {
        isLamarckian: true,
        trainingEpochs: 1,
      })

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn()
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
      const env = makeMockSupervisedEnvironment()
      const plugin = new BackpropPlugin(algorithm, {
        isLamarckian: false,
        trainingEpochs: 1,
      })

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn()
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      expect(result.updatedActions).toBeUndefined()
    })

    it('defaults to Lamarckian (returns updatedActions) when no options given', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const plugin = new BackpropPlugin(algorithm)

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = makeMockEvaluationContext()
      const defaultEvaluate = vi.fn()
      const result = await plugin.evaluateGenome(
        mockGenome,
        defaultEvaluate,
        evalContext
      )

      expect(result.updatedActions).toBeDefined()
      expect(result.updatedActions).toEqual(expect.any(Array))
    })
  })

  describe('evaluateGenome — worker path', () => {
    it('dispatches to worker via context.call when workerTrainingCapabilities present', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const plugin = new BackpropPlugin(algorithm, {
        trainingEpochs: 5,
        learningRate: 0.02,
        isLamarckian: true,
      })

      const pluginContext = makeMockPluginContext(algorithm, env)
      plugin.initialize(pluginContext)

      const evalContext = {
        ...makeMockEvaluationContext(),
        workerTrainingCapabilities: { rl: { supported: false, methods: {} } },
        call: vi.fn().mockResolvedValue({
          fitness: 0.95,
          updatedActions: [[PhenotypeActionType.Link, 0, 2, 0.7]],
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

      expect(result.fitness).toBe(0.95)
      expect(evalContext.call).toHaveBeenCalledOnce()
      expect(defaultEvaluate).not.toHaveBeenCalled()

      // Verify updatedActions returned in result for evaluator-level writeback
      expect(result.updatedActions).toEqual([[PhenotypeActionType.Link, 0, 2, 0.7]])
    })
  })
})
