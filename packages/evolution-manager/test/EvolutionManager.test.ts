import { NEATAlgorithm, type NEATContext } from '@neat-evolution/neat'
import { describe, expect, test } from 'vitest'
import {
  createEvolutionManagerConfig,
  deserializeOrganism,
  EvolutionManager,
  getBuiltInEvolutionAlgorithmDefinition,
  organismToExecutor,
  type EvolutionManagerOptions,
  serializedToExecutor,
} from '../src/index.js'
import { createEnvironment } from '../src/xorEnvironment.js'

describe('EvolutionManager', () => {
  const environment = createEnvironment(null)
  const slotConfig: EvolutionManagerOptions<NEATContext> = {
    algorithm: {
      name: 'NEAT',
    },
    environment: {
      config: environment,
      pathname: '@neat-evolution/evolution-manager/xor-environment',
    },
  }

  function createManager(
    overrides: Partial<EvolutionManagerOptions<NEATContext>> = {}
  ): EvolutionManager<NEATContext> {
    return new EvolutionManager({
      ...slotConfig,
      ...overrides,
      algorithm: {
        ...slotConfig.algorithm,
        ...(overrides.algorithm ?? {}),
      },
      environment: {
        ...slotConfig.environment,
        ...(overrides.environment ?? {}),
      },
    })
  }

  describe('constructor validation', () => {
    test('throws on missing algorithm', () => {
      expect(() =>
        new EvolutionManager({
          ...slotConfig,
          algorithm: undefined as never,
        })
      ).toThrow('EvolutionManager requires an algorithm')
    })

    test('throws on missing environment', () => {
      expect(() =>
        new EvolutionManager({
          ...slotConfig,
          environment: undefined as never,
        })
      ).toThrow('EvolutionManager requires an environment')
    })

    test('constructs successfully with valid slot config', () => {
      const manager = createManager()
      expect(manager).toBeDefined()
    })
  })

  describe('config normalization', () => {
    test('derives algorithm and genome defaults from the built-in catalog', () => {
      const config = createEvolutionManagerConfig(slotConfig)

      expect(config.algorithm).toBe(NEATAlgorithm)
      expect(config.createEnvironmentPathname).toBe(
        '@neat-evolution/evolution-manager/xor-environment'
      )
      expect(config.genomeOptions).toEqual(NEATAlgorithm.defaultOptions)
      expect(config.configData).toEqual({
        neat: expect.any(Object),
      })
    })

    test('allows direct definitions from the shared catalog', () => {
      const definition = getBuiltInEvolutionAlgorithmDefinition('HyperNEAT')
      const config = createEvolutionManagerConfig({
        algorithm: {
          definition,
        },
        environment: {
          config: environment,
          pathname: '@neat-evolution/evolution-manager/xor-environment',
        },
      })

      expect(config.algorithm).toBe(definition.algorithm)
      expect(config.genomeOptions).toEqual(definition.createDefaultGenomeOptions())
      expect(config.configData).toEqual(definition.createDefaultConfigData())
    })

    test('merges evaluation and execution slots into evaluator runtime config', () => {
      const config = createEvolutionManagerConfig({
        ...slotConfig,
        evaluation: {
          options: {
            createExecutorPathname: '@neat-evolution/executor/backprop',
            threadCount: 2,
          },
        },
        execution: {
          createExecutionManager: '@neat-evolution/rl-core/actor-critic',
          executionManagerFactoryOptions: {
            learningRate: 0.1,
          },
        },
      })

      expect(config.evaluatorConfig).toEqual({
        createExecutorPathname: '@neat-evolution/executor/backprop',
        threadCount: 2,
        hydrateEnvironmentOptions: {
          createExecutionManager: '@neat-evolution/rl-core/actor-critic',
        },
        environmentRuntimeData: {
          executionManagerFactoryOptions: {
            learningRate: 0.1,
          },
        },
      })
    })
  })

  describe('currentPopulation', () => {
    test('returns undefined before init', () => {
      const manager = createManager()
      expect(manager.currentPopulation).toBeUndefined()
    })

    test('returns population after init', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
      })
      await manager.init()
      expect(manager.currentPopulation).toBeDefined()
      await manager.terminate()
    })
  })

  describe('init() idempotency', () => {
    test('calling init() twice does not recreate population', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
      })
      await manager.init()
      const pop1 = manager.currentPopulation
      await manager.init()
      const pop2 = manager.currentPopulation
      expect(pop1).toBe(pop2)
      await manager.terminate()
    })
  })

  describe('local mode (no evaluation options)', () => {
    test('creates population with local evaluator and reproducer', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
      })
      await manager.init()
      const population = manager.currentPopulation
      expect(population).toBeDefined()
      if (population == null) {
        throw new Error('Population not created')
      }
      expect(population.species.size).toBeGreaterThan(0)
      await manager.terminate()
    })
  })

  describe('initializePopulation()', () => {
    test('runs initial mutations and first evaluation', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: { initialMutations: 5 },
      })
      await manager.initializePopulation()
      const population = manager.currentPopulation
      if (population == null) {
        throw new Error('Population not created')
      }
      expect(population.best()).toBeDefined()
      expect(population.best()?.fitness).not.toBeNull()
      await manager.terminate()
    })

    test('is idempotent', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: { initialMutations: 3 },
      })
      await manager.initializePopulation()
      const best1 = manager.currentPopulation?.best()?.fitness
      await manager.initializePopulation()
      const best2 = manager.currentPopulation?.best()?.fitness
      expect(best1).toBe(best2)
      await manager.terminate()
    })
  })

  describe('evolve()', () => {
    test('auto-inits when called without explicit init()', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 1,
          initialMutations: 3,
        },
      })
      const best = await manager.evolve()
      expect(best).toBeDefined()
      expect(best?.fitness).not.toBeNull()
      expect(manager.currentPopulation).toBeDefined()
      await manager.terminate()
    })

    test('returns best organism after evolution', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 2,
          initialMutations: 5,
        },
      })
      const best = await manager.evolve()
      expect(best).toBeDefined()
      expect(typeof best?.fitness).toBe('number')
      await manager.terminate()
    })

    test('per-call options override constructor options', async () => {
      let afterEvaluateCount = 0
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 5,
          initialMutations: 3,
        },
      })
      await manager.evolve({
        iterations: 1,
        afterEvaluate: () => {
          afterEvaluateCount++
        },
      })
      expect(afterEvaluateCount).toBe(1)
      await manager.terminate()
    })
  })

  describe('initialMutations', () => {
    test('applied during initializePopulation, not during evolve', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 1,
          initialMutations: 10,
        },
      })
      await manager.initializePopulation()

      const population = manager.currentPopulation
      if (population == null) {
        throw new Error('Population not created')
      }

      let afterEvaluateCount = 0
      await manager.evolve({
        iterations: 1,
        afterEvaluate: () => {
          afterEvaluateCount++
        },
      })
      expect(afterEvaluateCount).toBe(1)
      await manager.terminate()
    })
  })

  describe('terminate() + re-init', () => {
    test('terminate resets state, init() can be called again', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
      })
      await manager.init()
      const pop1 = manager.currentPopulation
      expect(pop1).toBeDefined()

      await manager.terminate()
      expect(manager.currentPopulation).toBeUndefined()

      await manager.init()
      const pop2 = manager.currentPopulation
      expect(pop2).toBeDefined()
      expect(pop2).not.toBe(pop1)
      await manager.terminate()
    })
  })

  describe('getBestExecutor()', () => {
    test('throws before population is initialized', () => {
      const manager = createManager()
      expect(() => manager.getBestExecutor()).toThrow(
        'Population not initialized'
      )
    })

    test('returns executor even before evaluation', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
      })
      await manager.init()
      const executor = manager.getBestExecutor()
      expect(executor).toBeDefined()
      await manager.terminate()
    })

    test('returns executor after evolution', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 1,
          initialMutations: 3,
        },
      })
      await manager.evolve()
      const executor = manager.getBestExecutor()
      const output = executor.forward([0, 1])
      expect(output).toHaveLength(1)
      expect(typeof output[0]).toBe('number')
      await manager.terminate()
    })
  })

  describe('organismToExecutor()', () => {
    test('converts organism to a working executor', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 1,
          initialMutations: 3,
        },
      })
      await manager.evolve()
      const best = manager.currentPopulation?.best()
      if (best == null) {
        throw new Error('No best organism')
      }
      const executor = manager.organismToExecutor(best)
      const output = executor.forward([1, 0])
      expect(output).toHaveLength(1)
      expect(typeof output[0]).toBe('number')
      await manager.terminate()
    })
  })

  describe('getPopulationData()', () => {
    test('throws before population is initialized', () => {
      const manager = createManager()
      expect(() => manager.getPopulationData()).toThrow(
        'Population not initialized'
      )
    })

    test('returns PopulationData after evolution', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 1,
          initialMutations: 3,
        },
      })
      await manager.evolve()
      const data = manager.getPopulationData()
      expect(data.algorithmName).toBe('NEAT')
      expect(data.factoryOptions.species.length).toBeGreaterThan(0)
      await manager.terminate()
    })
  })

  describe('createOrganism()', () => {
    test('round-trips: organism.toJSON() -> createOrganism()', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 1,
          initialMutations: 5,
        },
      })
      await manager.evolve()
      const best = manager.currentPopulation?.best()
      if (best == null) {
        throw new Error('No best organism')
      }

      const organismData = best.toJSON()
      const restored = manager.createOrganism(organismData)
      expect(restored.generation).toBe(best.generation)
      expect(restored.fitness).toBe(best.fitness)

      const originalExecutor = manager.organismToExecutor(best)
      const restoredExecutor = manager.organismToExecutor(restored)
      const input = [0.5, 0.5]
      const originalOutput = originalExecutor.forward(input)
      const restoredOutput = restoredExecutor.forward(input)

      expect(restoredOutput).toHaveLength(originalOutput.length)
      for (let i = 0; i < originalOutput.length; i++) {
        expect(restoredOutput[i]).toBeCloseTo(originalOutput[i] ?? 0, 2)
      }
      await manager.terminate()
    })
  })

  describe('population factory restore', () => {
    test('restores population and continues evolving', async () => {
      const manager1 = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 2,
          initialMutations: 5,
        },
      })
      await manager1.evolve()
      const savedData = manager1.getPopulationData()
      await manager1.terminate()

      const manager2 = createManager({
        population: {
          options: { populationSize: 10 },
          factoryOptions: savedData.factoryOptions,
        },
        evolution: {
          iterations: 1,
          initialMutations: 0,
        },
      })
      await manager2.evolve()
      const population2 = manager2.currentPopulation
      if (population2 == null) {
        throw new Error('Population not created')
      }
      expect(population2.best()).toBeDefined()
      expect(population2.best()?.fitness).not.toBeNull()
      expect(population2.species.size).toBeGreaterThan(0)
      await manager2.terminate()
    })

    test('full round-trip: getPopulationData -> JSON -> restore', async () => {
      const manager1 = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 1,
          initialMutations: 5,
        },
      })
      await manager1.evolve()
      const savedData = manager1.getPopulationData()
      const parsed = JSON.parse(JSON.stringify(savedData))

      const manager2 = createManager({
        population: {
          options: { populationSize: 10 },
          factoryOptions: parsed.factoryOptions,
        },
        evolution: {
          iterations: 1,
          initialMutations: 0,
        },
      })
      await manager2.evolve()
      expect(manager2.currentPopulation?.best()?.fitness).not.toBeNull()
      await manager2.terminate()
    })
  })

  describe('standalone utilities', () => {
    test('deserializeOrganism() works without a manager', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 1,
          initialMutations: 3,
        },
      })
      await manager.evolve()
      const best = manager.currentPopulation?.best()
      if (best == null) {
        throw new Error('No best organism')
      }
      const organismData = best.toJSON()
      await manager.terminate()

      const restored = deserializeOrganism(
        NEATAlgorithm,
        organismData,
        environment.description
      )
      expect(restored.generation).toBe(best.generation)
      expect(restored.fitness).toBe(best.fitness)

      const executor = organismToExecutor(NEATAlgorithm, restored)
      expect(executor.forward([0, 1])).toHaveLength(1)
    })

    test('serializedToExecutor() converts data directly to executor', async () => {
      const manager = createManager({
        population: { options: { populationSize: 10 } },
        evolution: {
          iterations: 1,
          initialMutations: 3,
        },
      })
      await manager.evolve()
      const best = manager.currentPopulation?.best()
      if (best == null) {
        throw new Error('No best organism')
      }
      const organismData = best.toJSON()

      const originalExecutor = manager.organismToExecutor(best)
      const input = [0.3, 0.7]
      const expectedOutput = originalExecutor.forward(input)
      await manager.terminate()

      const executor = serializedToExecutor(
        NEATAlgorithm,
        organismData,
        environment.description
      )
      expect(executor.forward(input)).toEqual(expectedOutput)
    })
  })
})
