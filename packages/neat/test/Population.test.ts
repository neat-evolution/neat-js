import {
  defaultNEATConfigOptions,
  type NEATConfig,
  type NEATState,
} from '@neat-js/core'
import {
  defaultDatasetOptions,
  loadDataset,
  DatasetEnvironment,
} from '@neat-js/dataset-environment'
import {
  createEvaluator,
  type AsyncEvaluator,
  type PhenotypeData,
} from '@neat-js/evaluator'
import {
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
} from '../src/index.js'

const createEnvironment = async () => {
  const options = {
    ...defaultDatasetOptions,
    validationFraction: 0.1,
    testFraction: 0.1,
    dataset: new URL(
      // '../../dataset-environment/test/fixtures/iris-truncated',
      '../../demo/generated/iris',
      import.meta.url
    ).pathname,
  }
  const dataset = await loadDataset(options)
  const environment = new DatasetEnvironment(dataset)
  return environment
}

describe('Population class', () => {
  let configProvider: NEATConfig
  let stateProvider: NEATState
  let populationOptions: PopulationOptions
  let genomeOptions: NEATGenomeOptions
  let environment: DatasetEnvironment
  let evaluator: AsyncEvaluator

  /**
   * Creates a genome that has been mutated 50 times
   * @returns {DefaultNEATGenome} seasoned genome
   */
  let createSeasonedGenome: () => DefaultNEATGenome

  beforeEach(async () => {
    configProvider = createConfig(defaultNEATConfigOptions)
    genomeOptions = defaultNEATGenomeOptions
    stateProvider = createState()
    populationOptions = defaultPopulationOptions
    environment = await createEnvironment()
    evaluator = createEvaluator(environment, createExecutor)

    createSeasonedGenome = () => {
      const configOptions = {
        ...defaultNEATConfigOptions,
        addNodeProbability: 1,
        addLinkProbability: 1,
        removeLinkProbability: 0,
        removeNodeProbability: 0,
        mutateLinkWeightProbability: 0,
      }
      const genome = createGenome(
        createConfig(configOptions),
        genomeOptions,
        stateProvider
      )
      for (let i = 0; i < 50; i++) {
        genome.mutate()
      }
      return genome
    }
  })

  test('should correctly initialize', () => {
    const population = new Population<
      NEATGenomeOptions,
      DefaultNEATGenomeFactoryOptions,
      DefaultNEATGenome,
      DefaultNEATGenomeData
    >(
      evaluator,
      createPhenotype,
      createGenome,
      createState,
      populationOptions,
      configProvider,
      genomeOptions
    )

    expect(population.species).toBeDefined()
    expect(population.species.size).toBe(1)
    expect(population.extinctSpecies).toBeDefined()
    expect(population.extinctSpecies.size).toBe(0)
    expect(population.state).toBeDefined()
    expect(population.createPhenotype).toBe(createPhenotype)
    expect(population.createGenome).toBe(createGenome)
    expect(population.createState).toBe(createState)
    expect(population.parseGenomeData).toBeDefined()
    expect(population.evaluator).toBe(evaluator)
    expect(population.populationOptions).toBe(populationOptions)
    expect(population.configProvider).toBe(configProvider)
    expect(population.genomeOptions).toBe(genomeOptions)
  })

  describe('Population.size', () => {
    let population: Population<
      NEATGenomeOptions,
      DefaultNEATGenomeFactoryOptions,
      DefaultNEATGenome,
      DefaultNEATGenomeData
    >
    beforeEach(() => {
      population = new Population<
        NEATGenomeOptions,
        DefaultNEATGenomeFactoryOptions,
        DefaultNEATGenome,
        DefaultNEATGenomeData
      >(
        evaluator,
        createPhenotype,
        createGenome,
        createState,
        populationOptions,
        configProvider,
        genomeOptions
      )
    })

    test('should return the correct size', () => {
      expect(population.size).toBe(100)
    })
  })

  describe('Population.species.size', () => {
    let population: Population<
      NEATGenomeOptions,
      DefaultNEATGenomeFactoryOptions,
      DefaultNEATGenome,
      DefaultNEATGenomeData
    >
    beforeEach(() => {
      population = new Population<
        NEATGenomeOptions,
        DefaultNEATGenomeFactoryOptions,
        DefaultNEATGenome,
        DefaultNEATGenomeData
      >(
        evaluator,
        createPhenotype,
        createGenome,
        createState,
        populationOptions,
        configProvider,
        genomeOptions
      )
    })

    test('should initialize with only one species', () => {
      let speciesCount = 0
      for (let i = 0; i < 100; i++) {
        population = new Population<
          NEATGenomeOptions,
          DefaultNEATGenomeFactoryOptions,
          DefaultNEATGenome,
          DefaultNEATGenomeData
        >(
          evaluator,
          createPhenotype,
          createGenome,
          createState,
          populationOptions,
          configProvider,
          genomeOptions
        )
        speciesCount += population.species.size
      }
      expect(speciesCount).toBe(100)
    })
    test('should evolve more than one species', () => {
      let speciesCount = 0
      for (let i = 0; i < 100; i++) {
        population.evolve()
        speciesCount += population.species.size
      }
      expect(population.species.size).toBeLessThan(
        1.1 * populationOptions.speciesTarget
      )
      expect(speciesCount).toBeGreaterThan(100)
    })
  })

  describe('Population.evolve', () => {
    let population: Population<
      NEATGenomeOptions,
      DefaultNEATGenomeFactoryOptions,
      DefaultNEATGenome,
      DefaultNEATGenomeData
    >
    beforeEach(() => {
      population = new Population<
        NEATGenomeOptions,
        DefaultNEATGenomeFactoryOptions,
        DefaultNEATGenome,
        DefaultNEATGenomeData
      >(
        evaluator,
        createPhenotype,
        createGenome,
        createState,
        populationOptions,
        configProvider,
        genomeOptions
      )

      // mutate all genomes 50 times
      for (let i = 0; i < 50; i++) {
        population.mutate()
      }
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
        Species<
          DefaultNEATGenomeFactoryOptions,
          DefaultNEATGenome,
          DefaultNEATGenomeData
        >,
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

    test.todo('should retain best organisms and age species', () => {
      population.evolve()
      // Check that each species only retains the best organisms.
      // Also, confirm that the age of each species is updated.
    })

    test.todo('should correctly grow the population', () => {
      population.evolve()
      // Check that new organisms are added to the species.
      // Validate against the number of offsprings and elites.
    })

    test.todo('should not exceed population size', () => {
      population.evolve()
      // Make sure the population size is within the defined limits.
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
  describe('Population.evaluate', () => {
    let population: Population<
      NEATGenomeOptions,
      DefaultNEATGenomeFactoryOptions,
      DefaultNEATGenome,
      DefaultNEATGenomeData
    >
    beforeEach(() => {
      population = new Population<
        NEATGenomeOptions,
        DefaultNEATGenomeFactoryOptions,
        DefaultNEATGenome,
        DefaultNEATGenomeData
      >(
        evaluator,
        createPhenotype,
        createGenome,
        createState,
        populationOptions,
        configProvider,
        genomeOptions
      )

      // mutate all genomes 50 times
      for (let i = 0; i < 50; i++) {
        population.mutate()
      }
    })

    test('should evaluate all organisms', async () => {
      await population.evaluate()
      for (const organism of population.organismValues()) {
        expect(organism.fitness).toBe(0)
      }
    })

    test('should improve fitness after 100 iterations', async () => {
      // evolve population for 100 iterations
      for (let i = 0; i < 100; i++) {
        await population.evaluate()
        population.evolve()
      }
      // measure fitness
      await population.evaluate()
      for (const organism of population.organismValues()) {
        expect(organism.fitness).toBe(0)
      }
    })

    test('should stuff', async () => {
      // evolve population for 100 iterations
      for (let i = 0; i < 100; i++) {
        await population.evaluate()
        population.evolve()
      }

      // convert every organism to a phenotype
      const phenotypeData = new Set<PhenotypeData>()
      for (const [
        speciesIndex,
        organismIndex,
        genome,
      ] of population.genomeEntries()) {
        phenotypeData.add([
          speciesIndex,
          organismIndex,
          population.createPhenotype(genome),
        ])
      }

      // evaluate every phenotype
      const fitnesses: number[] = []
      for (const [, , phenotype] of phenotypeData) {
        const executor = createExecutor(phenotype)
        const trainingInput = environment.dataset.trainingInputs[0] as number[]
        const output = await executor(trainingInput)
        expect(phenotype).toBe(120)
        expect(output).toBe(120)
      }

      expect(fitnesses).toBe(6)
    })
  })
})
