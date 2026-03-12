import type { Environment } from '@neat-evolution/environment'
import {
  deserializeOrganism,
  EvolutionManager,
  organismToExecutor,
  serializedToExecutor,
} from '@neat-evolution/evolution-manager'
import type { SyncExecutor } from '@neat-evolution/executor'
import { NEATAlgorithm } from '@neat-evolution/neat'
import { describe, expect, test } from 'vitest'

/**
 * Minimal environment for testing: 2 inputs, 1 output.
 * Fitness = 1 - average absolute error on a simple pattern.
 */
function createTestEnvironment(): Environment<null> {
  const testCases = [
    { input: [0, 0], expected: 0 },
    { input: [0, 1], expected: 1 },
    { input: [1, 0], expected: 1 },
    { input: [1, 1], expected: 0 },
  ]

  return {
    description: { inputs: 2, outputs: 1 },
    isAsync: false,
    toFactoryOptions: () => null,
    evaluate: (executor: SyncExecutor) => {
      let totalError = 0
      for (const { input, expected } of testCases) {
        const output = executor.execute(input)
        totalError += Math.abs((output[0] ?? 0) - expected)
      }
      return 1 - totalError / testCases.length
    },
    evaluateAsync: async (executor) => {
      let totalError = 0
      for (const { input, expected } of testCases) {
        const output = await executor.execute(input)
        totalError += Math.abs((output[0] ?? 0) - expected)
      }
      return 1 - totalError / testCases.length
    },
  }
}

describe('EvolutionManager', () => {
  const environment = createTestEnvironment()

  describe('constructor validation', () => {
    test('throws on missing algorithm', () => {
      expect(
        () =>
          new EvolutionManager({
            algorithm: undefined as never,
            environment,
          })
      ).toThrow('EvolutionManager requires an algorithm')
    })

    test('throws on missing environment', () => {
      expect(
        () =>
          new EvolutionManager({
            algorithm: NEATAlgorithm,
            environment: undefined as never,
          })
      ).toThrow('EvolutionManager requires an environment')
    })

    test('constructs successfully with valid config', () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
      })
      expect(manager).toBeDefined()
    })
  })

  describe('currentPopulation', () => {
    test('returns undefined before init', () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
      })
      expect(manager.currentPopulation).toBeUndefined()
    })

    test('returns population after init', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
      })
      await manager.init()
      expect(manager.currentPopulation).toBeDefined()
      await manager.terminate()
    })
  })

  describe('init() idempotency', () => {
    test('calling init() twice does not recreate population', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
      })
      await manager.init()
      const pop1 = manager.currentPopulation
      await manager.init()
      const pop2 = manager.currentPopulation
      expect(pop1).toBe(pop2)
      await manager.terminate()
    })
  })

  describe('local mode (no workerConfig)', () => {
    test('creates population with local evaluator and reproducer', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
      })
      await manager.init()
      const population = manager.currentPopulation
      expect(population).toBeDefined()
      // Population should have species
      if (population == null) {
        throw new Error('Population not created')
      }
      expect(population.species.size).toBeGreaterThan(0)
      await manager.terminate()
    })
  })

  describe('initializePopulation()', () => {
    test('runs initial mutations and first evaluation', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: { initialMutations: 5 },
      })
      await manager.initializePopulation()
      const population = manager.currentPopulation
      if (population == null) {
        throw new Error('Population not created')
      }
      // After evaluation, best organism should have a fitness value
      const best = population.best()
      expect(best).toBeDefined()
      expect(best?.fitness).not.toBeNull()
      await manager.terminate()
    })

    test('is idempotent', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: { initialMutations: 3 },
      })
      await manager.initializePopulation()
      const best1 = manager.currentPopulation?.best()?.fitness
      await manager.initializePopulation()
      const best2 = manager.currentPopulation?.best()?.fitness
      // Same fitness — population wasn't re-mutated or re-evaluated
      expect(best1).toBe(best2)
      await manager.terminate()
    })
  })

  describe('evolve()', () => {
    test('auto-inits when called without explicit init()', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 1,
          initialMutations: 3,
          logInterval: 1000,
        },
      })
      // No init() call — evolve() should handle it
      const best = await manager.evolve()
      expect(best).toBeDefined()
      expect(best?.fitness).not.toBeNull()
      expect(manager.currentPopulation).toBeDefined()
      await manager.terminate()
    })

    test('returns best organism after evolution', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 2,
          initialMutations: 5,
          logInterval: 1000,
        },
      })
      const best = await manager.evolve()
      expect(best).toBeDefined()
      expect(typeof best?.fitness).toBe('number')
      await manager.terminate()
    })

    test('per-call options override constructor options', async () => {
      let afterEvaluateCount = 0
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 5,
          initialMutations: 3,
          logInterval: 1000,
        },
      })
      // Override iterations to 1 via per-call options
      await manager.evolve({
        iterations: 1,
        afterEvaluate: () => {
          afterEvaluateCount++
        },
      })
      // afterEvaluate should have been called once (1 iteration)
      expect(afterEvaluateCount).toBe(1)
      await manager.terminate()
    })
  })

  describe('initialMutations', () => {
    test('applied during initializePopulation, not during evolve', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 1,
          initialMutations: 10,
          logInterval: 1000,
        },
      })
      await manager.initializePopulation()

      // After initializePopulation, organisms should have some hidden nodes/links from mutations
      const population = manager.currentPopulation
      if (population == null) {
        throw new Error('Population not created')
      }

      // Now evolve — initialMutations should be forced to 0 (see EvolutionManager.evolve)
      // If initialMutations were applied again, we'd see the evolve loop's first iteration
      // run 10 mutations instead of the normal evolve cycle
      let afterEvaluateCount = 0
      await manager.evolve({
        iterations: 1,
        afterEvaluate: () => {
          afterEvaluateCount++
        },
      })
      // evolve ran 1 iteration with afterEvaluate
      expect(afterEvaluateCount).toBe(1)
      await manager.terminate()
    })
  })

  describe('terminate() + re-init', () => {
    test('terminate resets state, init() can be called again', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
      })
      await manager.init()
      const pop1 = manager.currentPopulation
      expect(pop1).toBeDefined()

      await manager.terminate()
      expect(manager.currentPopulation).toBeUndefined()

      await manager.init()
      const pop2 = manager.currentPopulation
      expect(pop2).toBeDefined()
      // New population, not the same object
      expect(pop2).not.toBe(pop1)
      await manager.terminate()
    })
  })

  describe('getBestExecutor()', () => {
    test('throws before population is initialized', () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
      })
      expect(() => manager.getBestExecutor()).toThrow(
        'Population not initialized'
      )
    })

    test('returns executor even before evaluation (best picks first organism)', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
      })
      await manager.init()
      // Population exists — best() returns an organism even before evaluation
      const executor = manager.getBestExecutor()
      expect(executor).toBeDefined()
      await manager.terminate()
    })

    test('returns executor after evolution', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 1,
          initialMutations: 3,
          logInterval: 1000,
        },
      })
      await manager.evolve()
      const executor = manager.getBestExecutor()
      expect(executor).toBeDefined()
      // Should produce output for our 2-input environment
      const output = executor.execute([0, 1])
      expect(output).toHaveLength(1)
      expect(typeof output[0]).toBe('number')
      await manager.terminate()
    })
  })

  describe('organismToExecutor()', () => {
    test('converts organism to a working executor', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 1,
          initialMutations: 3,
          logInterval: 1000,
        },
      })
      await manager.evolve()
      const population = manager.currentPopulation
      if (population == null) {
        throw new Error('Population not created')
      }
      const best = population.best()
      if (best == null) {
        throw new Error('No best organism')
      }
      const executor = manager.organismToExecutor(best)
      const output = executor.execute([1, 0])
      expect(output).toHaveLength(1)
      expect(typeof output[0]).toBe('number')
      await manager.terminate()
    })
  })

  describe('getPopulationData()', () => {
    test('throws before population is initialized', () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
      })
      expect(() => manager.getPopulationData()).toThrow(
        'Population not initialized'
      )
    })

    test('returns PopulationData after evolution', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 1,
          initialMutations: 3,
          logInterval: 1000,
        },
      })
      await manager.evolve()
      const data = manager.getPopulationData()
      expect(data).toBeDefined()
      expect(data.algorithmName).toBe('NEAT')
      expect(data.factoryOptions).toBeDefined()
      expect(data.factoryOptions.species.length).toBeGreaterThan(0)
      await manager.terminate()
    })
  })

  describe('createOrganism()', () => {
    test('round-trips: organism.toJSON() → createOrganism() → working organism', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 1,
          initialMutations: 5,
          logInterval: 1000,
        },
      })
      await manager.evolve()
      const population = manager.currentPopulation
      if (population == null) {
        throw new Error('Population not created')
      }
      const best = population.best()
      if (best == null) {
        throw new Error('No best organism')
      }

      // Serialize
      const organismData = best.toJSON()

      // Deserialize via manager
      const restored = manager.createOrganism(organismData)
      expect(restored.generation).toBe(best.generation)
      expect(restored.fitness).toBe(best.fitness)

      // Restored organism should produce similar output
      const originalExecutor = manager.organismToExecutor(best)
      const restoredExecutor = manager.organismToExecutor(restored)
      const input = [0.5, 0.5]
      const originalOutput = originalExecutor.execute(input)
      const restoredOutput = restoredExecutor.execute(input)
      expect(restoredOutput).toHaveLength(originalOutput.length)
      // Genome factory options round-trip may produce slightly different
      // connection ordering, so check approximate equality
      for (let i = 0; i < originalOutput.length; i++) {
        expect(restoredOutput[i]).toBeCloseTo(originalOutput[i] ?? 0, 2)
      }
      await manager.terminate()
    })
  })

  describe('populationFactoryOptions (save/restore)', () => {
    test('restores population and continues evolving', async () => {
      // First run: evolve and save
      const manager1 = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 2,
          initialMutations: 5,
          logInterval: 1000,
        },
      })
      await manager1.evolve()
      const savedData = manager1.getPopulationData()
      await manager1.terminate()

      // Second run: restore from saved data and continue
      const manager2 = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        populationFactoryOptions: savedData.factoryOptions,
        evolutionOptions: {
          iterations: 1,
          initialMutations: 0,
          logInterval: 1000,
        },
      })
      await manager2.evolve()
      const population2 = manager2.currentPopulation
      if (population2 == null) {
        throw new Error('Population not created')
      }
      // Population was restored — should have organisms with fitness
      const best2 = population2.best()
      expect(best2).toBeDefined()
      expect(best2?.fitness).not.toBeNull()
      // The species structure should be preserved
      expect(population2.species.size).toBeGreaterThan(0)
      await manager2.terminate()
    })

    test('full round-trip: getPopulationData → JSON → restore', async () => {
      const manager1 = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 1,
          initialMutations: 5,
          logInterval: 1000,
        },
      })
      await manager1.evolve()
      const savedData = manager1.getPopulationData()

      // Simulate JSON round-trip (as would happen with IndexedDB/localStorage)
      const jsonString = JSON.stringify(savedData)
      const parsed = JSON.parse(jsonString)

      const manager2 = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        populationFactoryOptions: parsed.factoryOptions,
        evolutionOptions: {
          iterations: 1,
          initialMutations: 0,
          logInterval: 1000,
        },
      })
      await manager2.evolve()
      expect(manager2.currentPopulation?.best()?.fitness).not.toBeNull()
      await manager2.terminate()
    })
  })

  describe('standalone utilities', () => {
    test('deserializeOrganism() works without a manager', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 1,
          initialMutations: 3,
          logInterval: 1000,
        },
      })
      await manager.evolve()
      const best = manager.currentPopulation?.best()
      if (best == null) {
        throw new Error('No best organism')
      }
      const organismData = best.toJSON()
      await manager.terminate()

      // Deserialize without a running manager
      const restored = deserializeOrganism(
        NEATAlgorithm,
        organismData,
        environment.description
      )
      expect(restored.generation).toBe(best.generation)
      expect(restored.fitness).toBe(best.fitness)

      // Should produce working executor
      const executor = organismToExecutor(NEATAlgorithm, restored)
      const output = executor.execute([0, 1])
      expect(output).toHaveLength(1)
    })

    test('serializedToExecutor() converts data directly to executor', async () => {
      const manager = new EvolutionManager({
        algorithm: NEATAlgorithm,
        environment,
        populationOptions: { populationSize: 10 },
        evolutionOptions: {
          iterations: 1,
          initialMutations: 3,
          logInterval: 1000,
        },
      })
      await manager.evolve()
      const best = manager.currentPopulation?.best()
      if (best == null) {
        throw new Error('No best organism')
      }
      const organismData = best.toJSON()

      // Get reference output
      const originalExecutor = manager.organismToExecutor(best)
      const input = [0.3, 0.7]
      const expectedOutput = originalExecutor.execute(input)
      await manager.terminate()

      // serializedToExecutor should produce same output
      const executor = serializedToExecutor(
        NEATAlgorithm,
        organismData,
        environment.description
      )
      expect(executor.execute(input)).toEqual(expectedOutput)
    })
  })
})
