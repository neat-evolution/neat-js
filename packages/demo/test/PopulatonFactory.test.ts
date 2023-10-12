import { defaultNEATConfigOptions } from '@neat-js/core'
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-js/dataset-environment'
import {
  AsyncEvaluator,
  type FitnessData,
  type GenomeEntry,
} from '@neat-js/evaluator'
import {
  createReproducer,
  defaultEvolutionOptions,
  defaultPopulationOptions,
  evolve,
  Population,
  type PopulationOptions,
} from '@neat-js/evolution'
import { createExecutor } from '@neat-js/executor'
import {
  NEATAlgorithm,
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
  NEATGenome,
  type NEATConfig,
  type NEATPopulation,
} from '@neat-js/neat'
import { beforeEach, describe, expect, test } from 'vitest'

import {
  genomeActions,
  genomeConnections,
  genomeFactoryOptions,
  genomeFitness,
} from './fixtures/debugOutput.js'

describe('PopulationFactory', () => {
  let evaluator: AsyncEvaluator
  let algorithm: typeof NEATAlgorithm
  let configProvider: NEATConfig
  let population: NEATPopulation<undefined>
  let populationOptions: PopulationOptions
  let genomeOptions: NEATGenomeOptions

  beforeEach(async () => {
    const datasetOptions = {
      ...defaultDatasetOptions,
      dataset: new URL('../generated/iris', import.meta.url).pathname,
      validationFraction: 0.1,
      testFraction: 0.1,
    }
    algorithm = NEATAlgorithm

    const dataset = await loadDataset(datasetOptions)
    const environment = new DatasetEnvironment(dataset)
    evaluator = new AsyncEvaluator(algorithm, environment, createExecutor)

    configProvider = algorithm.createConfig(
      defaultNEATConfigOptions,
      null,
      null
    )
    populationOptions = { ...defaultPopulationOptions }

    genomeOptions = {
      ...defaultNEATGenomeOptions,
    }
    // 1. Create a population
    population = new Population(
      createReproducer,
      evaluator,
      algorithm,
      configProvider,
      populationOptions,
      undefined,
      genomeOptions,
      evaluator.environment.description
    )

    const evolutionOptions = {
      ...defaultEvolutionOptions,
      secondsLimit: 1,
      iterations: 10,
    }

    // 2. Mutate it 50 times
    for (let i = 0; i < 50; i++) {
      await population.mutate()
    }

    // 3. Evolve it for 10 iterations
    await evolve(population, evolutionOptions)
  })

  test('population.toJSON', async () => {
    const data = population.toJSON()
    expect(data).toBeDefined()
  })

  test('population.best().toJSON', async () => {
    const data = population.best()?.toJSON()
    expect(data).toBeDefined()
  })

  test('population.toFactoryOptions', () => {
    const factoryOptions = population.toFactoryOptions()
    expect(factoryOptions).toBeDefined()
  })

  test('hydrate population from factoryOptions', () => {
    const factoryOptions = population.toFactoryOptions()
    const hydratedPopulation: NEATPopulation<undefined> = new Population(
      createReproducer,
      evaluator,
      algorithm,
      configProvider,
      populationOptions,
      undefined,
      genomeOptions,
      evaluator.environment.description,
      factoryOptions
    )
    const data = population.toJSON()
    const hydratedData = hydratedPopulation.toJSON()
    expect(hydratedData.factoryOptions.species).toEqual(
      data.factoryOptions.species
    )
    expect(hydratedPopulation.toJSON()).toEqual(population.toJSON())
  })

  test('hydrate population from data', () => {
    const data = population.toJSON()
    const hydratedPopulation: NEATPopulation<undefined> = new Population(
      createReproducer,
      evaluator,
      algorithm,
      configProvider,
      populationOptions,
      undefined,
      genomeOptions,
      evaluator.environment.description,
      data.factoryOptions
    )
    const hydratedData = hydratedPopulation.toJSON()
    expect(hydratedData).toEqual(data)
  })

  test('hydrate genome from data', () => {
    const genome = new NEATGenome(
      configProvider,
      algorithm.createState(),
      genomeOptions,
      evaluator.environment.description,
      genomeFactoryOptions
    )
    expect(genome.toFactoryOptions()).toEqual(genomeFactoryOptions)
  })

  test('hydrate actions from data', async () => {
    const genome = new NEATGenome(
      configProvider,
      algorithm.createState(),
      genomeOptions,
      evaluator.environment.description,
      genomeFactoryOptions
    )
    // hidden nodes
    expect(genome.hiddenNodes.size).toBe(
      genomeFactoryOptions.hiddenNodes.length
    )

    // links
    expect(genome.links.size).toBe(genomeFactoryOptions.links.length)

    // connections
    const connections = Array.from(genome.connections.connections())
    expect(connections).toHaveLength(genomeConnections.length)

    // sortTopologically
    const actions = Array.from(genome.connections.sortTopologically())
    expect(actions).toHaveLength(genomeActions.length)

    // evaluate
    const fitnessResults: FitnessData[] = []
    for await (const fitnessData of evaluator.evaluate([[0, 0, genome]])) {
      fitnessResults.push(fitnessData)
    }

    expect(fitnessResults[0]?.[2]).toBeDefined()
    expect(fitnessResults[0]?.[2]).toBeCloseTo(genomeFitness ?? 0)
  })

  test('evaluate', async () => {
    const genome = population.best()?.genome
    expect(genome).toBeDefined()
    if (!genome) {
      throw new Error('hydratedGenome is undefined')
    }

    const factoryOptions = population.toFactoryOptions()
    const hydratedPopulation: NEATPopulation<undefined> = new Population(
      createReproducer,
      evaluator,
      algorithm,
      configProvider,
      populationOptions,
      undefined,
      genomeOptions,
      evaluator.environment.description,
      factoryOptions
    )
    const hydratedGenome = hydratedPopulation.best()?.genome
    expect(hydratedGenome).toBeDefined()
    if (!hydratedGenome) {
      throw new Error('hydratedGenome is undefined')
    }

    const phenotypeData: GenomeEntry<NEATGenome> = [0, 0, genome]
    const hydratedPhenotypeData: GenomeEntry<NEATGenome> = [
      1,
      1,
      hydratedGenome,
    ]

    const fitnessResults: FitnessData[] = []
    for await (const fitnessData of evaluator.evaluate([
      phenotypeData,
      hydratedPhenotypeData,
    ])) {
      fitnessResults.push(fitnessData)
    }

    expect(fitnessResults[0]?.[2]).toBeDefined()
    expect(fitnessResults[0]?.[2]).toBeCloseTo(fitnessResults[1]?.[2] as number)
  })
})
