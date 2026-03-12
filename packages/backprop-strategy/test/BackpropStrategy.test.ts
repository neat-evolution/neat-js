import {
  Activation,
  type AnyGenome,
  type Phenotype,
  PhenotypeActionType,
} from '@neat-evolution/core'
import { describe, expect, it, vi } from 'vitest'

import { BackpropStrategy } from '../src/BackpropStrategy.js'

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

/** A minimal EvaluationContext — BackpropStrategy never calls these methods. */
function makeMockContext() {
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
  }
}

/** Drain an AsyncIterable into an array. */
async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = []
  for await (const item of iterable) {
    results.push(item)
  }
  return results
}

// A trivial genome object — BackpropStrategy treats it opaquely.
const mockGenome = { nodes: [], links: [] } as unknown as AnyGenome

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BackpropStrategy', () => {
  describe('construction', () => {
    it('throws when environment does not implement SupervisedEnvironment', () => {
      const algorithm = makeMockAlgorithm()
      const badEnv = { evaluate: vi.fn() }

      expect(() => new BackpropStrategy(algorithm, badEnv)).toThrow(
        'BackpropStrategy requires an environment that implements SupervisedEnvironment'
      )
    })

    it('throws when environment is null', () => {
      const algorithm = makeMockAlgorithm()

      expect(() => new BackpropStrategy(algorithm, null)).toThrow(
        'BackpropStrategy requires an environment that implements SupervisedEnvironment'
      )
    })

    it('throws when environment is a plain string', () => {
      const algorithm = makeMockAlgorithm()

      expect(() => new BackpropStrategy(algorithm, 'not-an-env')).toThrow(
        'BackpropStrategy requires an environment that implements SupervisedEnvironment'
      )
    })

    it('constructs successfully with a valid SupervisedEnvironment', () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()

      expect(() => new BackpropStrategy(algorithm, env)).not.toThrow()
    })
  })

  describe('Lamarckian writeback', () => {
    it('calls algorithm.writeBackWeights when isLamarckian: true', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const strategy = new BackpropStrategy(algorithm, env, {
        isLamarckian: true,
        trainingEpochs: 1,
      })

      const context = makeMockContext()
      const entries = [[0, 0, mockGenome]] as [
        number,
        number,
        typeof mockGenome,
      ][]
      await collect(strategy.evaluate(context, entries))

      expect(algorithm.writeBackWeights).toHaveBeenCalledOnce()
      expect(algorithm.writeBackWeights).toHaveBeenCalledWith(
        mockGenome,
        expect.any(Array)
      )
    })

    it('does NOT call algorithm.writeBackWeights when isLamarckian: false', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const strategy = new BackpropStrategy(algorithm, env, {
        isLamarckian: false,
        trainingEpochs: 1,
      })

      const context = makeMockContext()
      const entries = [[0, 0, mockGenome]] as [
        number,
        number,
        typeof mockGenome,
      ][]
      await collect(strategy.evaluate(context, entries))

      expect(algorithm.writeBackWeights).not.toHaveBeenCalled()
    })

    it('defaults to Lamarckian (isLamarckian: true) when no options given', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const strategy = new BackpropStrategy(algorithm, env)

      const context = makeMockContext()
      const entries = [[0, 0, mockGenome]] as [
        number,
        number,
        typeof mockGenome,
      ][]
      await collect(strategy.evaluate(context, entries))

      expect(algorithm.writeBackWeights).toHaveBeenCalledOnce()
    })
  })

  describe('fitness computation', () => {
    it('computes fitness using validation data via computeFitness', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment(0.75)
      const strategy = new BackpropStrategy(algorithm, env, {
        trainingEpochs: 1,
      })

      const context = makeMockContext()
      const entries = [[0, 0, mockGenome]] as [
        number,
        number,
        typeof mockGenome,
      ][]
      await collect(strategy.evaluate(context, entries))

      expect(env.getValidationData).toHaveBeenCalled()
      expect(env.computeFitness).toHaveBeenCalledOnce()
    })

    it('trains on training data for each epoch', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const strategy = new BackpropStrategy(algorithm, env, {
        trainingEpochs: 3,
      })

      const context = makeMockContext()
      const entries = [[0, 0, mockGenome]] as [
        number,
        number,
        typeof mockGenome,
      ][]
      await collect(strategy.evaluate(context, entries))

      // getTrainingData is called once; getValidationData is called once
      expect(env.getTrainingData).toHaveBeenCalledOnce()
      expect(env.getValidationData).toHaveBeenCalledOnce()
    })
  })

  describe('evaluate — yielded FitnessData tuples', () => {
    it('yields the correct [speciesIndex, organismIndex, fitness] tuple', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment(0.88)
      const strategy = new BackpropStrategy(algorithm, env, {
        trainingEpochs: 1,
      })

      const context = makeMockContext()
      const entries = [[2, 5, mockGenome]] as [
        number,
        number,
        typeof mockGenome,
      ][]
      const results = await collect(strategy.evaluate(context, entries))

      expect(results).toHaveLength(1)
      const [speciesIndex, organismIndex, fitness] = results[0]!
      expect(speciesIndex).toBe(2)
      expect(organismIndex).toBe(5)
      expect(fitness).toBe(0.88)
    })

    it('yields one FitnessData tuple per genome entry', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment(0.5)
      const strategy = new BackpropStrategy(algorithm, env, {
        trainingEpochs: 1,
      })

      const context = makeMockContext()
      const entries = [
        [0, 0, mockGenome],
        [0, 1, mockGenome],
        [1, 0, mockGenome],
      ] as [number, number, typeof mockGenome][]
      const results = await collect(strategy.evaluate(context, entries))

      expect(results).toHaveLength(3)
    })

    it('preserves speciesIndex and organismIndex for each entry in a batch', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment(0.6)
      const strategy = new BackpropStrategy(algorithm, env, {
        trainingEpochs: 1,
      })

      const context = makeMockContext()
      const entries = [
        [0, 0, mockGenome],
        [1, 3, mockGenome],
        [2, 7, mockGenome],
      ] as [number, number, typeof mockGenome][]
      const results = await collect(strategy.evaluate(context, entries))

      expect(results[0]![0]).toBe(0)
      expect(results[0]![1]).toBe(0)
      expect(results[1]![0]).toBe(1)
      expect(results[1]![1]).toBe(3)
      expect(results[2]![0]).toBe(2)
      expect(results[2]![1]).toBe(7)
    })

    it('calls createPhenotype once per genome entry', async () => {
      const algorithm = makeMockAlgorithm()
      const env = makeMockSupervisedEnvironment()
      const strategy = new BackpropStrategy(algorithm, env, {
        trainingEpochs: 1,
      })

      const context = makeMockContext()
      const entries = [
        [0, 0, mockGenome],
        [0, 1, mockGenome],
      ] as [number, number, typeof mockGenome][]
      await collect(strategy.evaluate(context, entries))

      expect(algorithm.createPhenotype).toHaveBeenCalledTimes(2)
      expect(algorithm.createPhenotype).toHaveBeenCalledWith(mockGenome)
    })
  })
})
