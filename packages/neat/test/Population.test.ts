import { defaultNEATConfigOptions } from '@neat-js/core'
import {
  defaultDatasetOptions,
  loadDataset,
  DatasetEnvironment,
} from '@neat-js/dataset-environment'
import { createEvaluator, type Evaluator } from '@neat-js/evaluator'
import {
  createReproducer,
  Population,
  defaultPopulationOptions,
  type PopulationOptions,
  type Species,
} from '@neat-js/evolution'
import { createExecutor } from '@neat-js/executor'
import {
  beforeEach,
  describe,
  expect,
  test,
  vi,
  type SpyInstance,
  afterEach,
} from 'vitest'

import {
  createConfig,
  defaultNEATGenomeOptions,
  type DefaultNEATGenome,
  type DefaultNEATGenomeData,
  type DefaultNEATGenomeFactoryOptions,
  type NEATGenomeOptions,
  createState,
  createGenome,
  createPhenotype,
  type NEATConfig,
  type NEATPopulation,
  type NEATState,
  NEATAlgorithm,
  type NEATLink,
  type NEATNode,
} from '../src/index.js'

const createEnvironment = async () => {
  const options = {
    ...defaultDatasetOptions,
    validationFraction: 0.1,
    testFraction: 0.1,
    dataset: new URL('./fixtures/iris', import.meta.url).pathname,
  }
  const dataset = await loadDataset(options)
  const environment = new DatasetEnvironment(dataset)
  return environment
}

describe('Population class', () => {
  let configProvider: NEATConfig
  let populationOptions: PopulationOptions
  let genomeOptions: NEATGenomeOptions
  let environment: DatasetEnvironment
  let evaluator: Evaluator

  beforeEach(async () => {
    configProvider = createConfig(defaultNEATConfigOptions)
    genomeOptions = defaultNEATGenomeOptions
    populationOptions = defaultPopulationOptions
    environment = await createEnvironment()
    evaluator = createEvaluator(environment, createExecutor)
  })

  test('should correctly initialize', () => {
    const population: NEATPopulation<undefined> = new Population(
      createReproducer,
      evaluator,
      NEATAlgorithm,
      configProvider,
      populationOptions,
      undefined,
      genomeOptions
    )

    expect(population.species).toBeDefined()
    expect(population.species.size).toBe(1)
    expect(population.extinctSpecies).toBeDefined()
    expect(population.extinctSpecies.size).toBe(0)
    expect(population.stateProvider).toBeDefined()
    expect(population.algorithm.createPhenotype).toBe(createPhenotype)
    expect(population.algorithm.createGenome).toBe(createGenome)
    expect(population.algorithm.createState).toBe(createState)
    expect(population.evaluator).toBe(evaluator)
    expect(population.populationOptions).toBe(populationOptions)
    expect(population.configProvider).toBe(configProvider)
    expect(population.genomeOptions).toEqual({
      ...genomeOptions,
      ...evaluator.environment.description,
    })
  })

  describe('Population.size', () => {
    let population: NEATPopulation<undefined>
    beforeEach(() => {
      population = new Population(
        createReproducer,
        evaluator,
        NEATAlgorithm,
        configProvider,
        populationOptions,
        undefined,
        genomeOptions
      )
    })

    test('should return the correct size', () => {
      expect(population.size).toBe(100)
    })
  })

  describe('Population.species.size', () => {
    let population: NEATPopulation<undefined>
    beforeEach(async () => {
      population = new Population(
        createReproducer,
        evaluator,
        NEATAlgorithm,
        configProvider,
        populationOptions,
        undefined,
        genomeOptions
      )
      for (let i = 0; i < 100; i++) {
        population.mutate()
      }
      await population.evaluate()
    })

    test('should initialize with only one species', () => {
      let speciesCount = 0
      for (let i = 0; i < 100; i++) {
        population = new Population(
          createReproducer,
          evaluator,
          NEATAlgorithm,
          configProvider,
          populationOptions,
          undefined,
          genomeOptions
        )
        speciesCount += population.species.size
      }
      expect(speciesCount).toBe(100)
    })
    test('should evolve more than one species', async () => {
      let speciesCount = 0
      for (let i = 0; i < 2; i++) {
        population.evolve()
        await population.evaluate()
        speciesCount += population.species.size
      }
      expect(population.species.size).toBeLessThan(
        population.populationOptions.populationSize / 2
      )
      expect(speciesCount).toBeGreaterThan(10)
    })
  })

  describe('Population.evolve', () => {
    let population: NEATPopulation<undefined>
    beforeEach(async () => {
      population = new Population(
        createReproducer,
        evaluator,
        NEATAlgorithm,
        configProvider,
        populationOptions,
        undefined,
        genomeOptions
      )

      // mutate all genomes 50 times
      for (let i = 0; i < 50; i++) {
        population.mutate()
      }
      await population.evaluate()
    })

    describe('Population.evolve species calls', () => {
      let speciesSpies: Array<Record<string, SpyInstance>> = []

      beforeEach(() => {
        // Create spies for each species' methods
        for (const species of population.species.values()) {
          const spyObj = {
            adjustFitness: vi.spyOn(species, 'adjustFitness'),
            calculateOffsprings: vi.spyOn(species, 'calculateOffsprings'),
            retainBest: vi.spyOn(species, 'retainBest'),
            age: vi.spyOn(species, 'age'),
            removeOld: vi.spyOn(species, 'removeOld'),
          }
          speciesSpies.push(spyObj)
        }
      })

      afterEach(() => {
        // Clean up spies
        for (const spyObj of speciesSpies) {
          for (const spy of Object.values(spyObj)) {
            spy.mockRestore()
          }
        }
        speciesSpies = []
      })

      test.each([
        'adjustFitness',
        'calculateOffsprings',
        'retainBest',
        'age',
        'removeOld',
      ])('should call %s exactly once', (methodName) => {
        population.evolve()
        for (const spyObj of speciesSpies) {
          expect(spyObj[methodName]).toHaveBeenCalledTimes(1)
        }
      })

      test('should call methods in the correct order', () => {
        population.evolve()
        for (const spyObj of speciesSpies) {
          const orderedSpies: SpyInstance[] = [
            spyObj['adjustFitness'] as SpyInstance,
            spyObj['calculateOffsprings'] as SpyInstance,
            spyObj['retainBest'] as SpyInstance,
            spyObj['age'] as SpyInstance,
            spyObj['removeOld'] as SpyInstance,
          ]
          for (const [i, spy] of orderedSpies.entries()) {
            const nextSpy = orderedSpies[i + 1]
            if (nextSpy != null) {
              expect(spy.mock.invocationCallOrder[0]).toBeLessThan(
                (nextSpy.mock.invocationCallOrder[0] ?? 0) as number
              )
            }
          }
        }
      })
    })

    test('should update the number of new elites and offsprings for each species', () => {
      const dataMap = new Map<
        Species<NEATGenomeOptions, DefaultNEATGenomeData, DefaultNEATGenome>,
        { elites: number; offsprings: number }
      >()

      for (const species of population.species.values()) {
        dataMap.set(species, {
          elites: species.elites,
          offsprings: species.offsprings,
        })
      }

      population.evolve()

      // Check that the elite count and offsprings count for each species is calculated correctly.
      let elitesChanged = false
      let offspringsChanges = false

      // simple check that something changed (potentially flaky)
      for (const species of population.species.values()) {
        const data = dataMap.get(species)
        if (data == null) {
          throw new Error('Species not found')
        }
        if (data.elites !== species.elites) {
          elitesChanged = true
        }
        if (data.offsprings !== species.offsprings) {
          offspringsChanges = true
        }
        if (elitesChanged && offspringsChanges) {
          break
        }
      }
      expect(elitesChanged).toBe(true)
      expect(offspringsChanges).toBe(true)
    })

    test('should adjust speciation threshold if speciesTarget is defined', () => {
      const options = population.populationOptions
      const threshold = options.speciationThreshold
      population.evolve()
      const newThreshold = options.speciationThreshold

      let expectedThreshold = threshold
      if (options.speciesTarget > 0) {
        if (population.species.size < options.speciesTarget) {
          expectedThreshold -= options.speciationThresholdMoveAmount
        } else if (population.species.size > options.speciesTarget) {
          expectedThreshold += options.speciationThresholdMoveAmount
        }
        expectedThreshold = Math.max(options.speciationThreshold, 0)
      }

      expect(newThreshold).toBe(expectedThreshold)
    })
  })
})
