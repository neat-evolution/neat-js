import { defaultNEATConfigOptions } from '@neat-js/core'
import {
  DatasetEnvironment,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-js/dataset-environment'
import { AsyncEvaluator, type FitnessData } from '@neat-js/evaluator'
import {
  Population,
  defaultEvolutionOptions,
  defaultPopulationOptions,
  evolve,
  type PopulationOptions,
} from '@neat-js/evolution'
import { createExecutor } from '@neat-js/executor'
import {
  NEATAlgorithm,
  defaultNEATGenomeOptions,
  type NEATGenomeOptions,
  type NEATNode,
  type NEATLink,
  type NEATState,
  type DefaultNEATGenomeFactoryOptions,
  type DefaultNEATGenomeData,
  DefaultNEATGenome,
  type NEATConfig,
} from '@neat-js/neat'
import type { PhenotypeData } from '@neat-js/phenotype'
import { beforeEach, describe, expect, test } from 'vitest'

import {
  genomeActions,
  genomeConnections,
  genomeFactoryOptions,
  genomeFitness,
  genomePhenotype,
} from './fixtures/debugOutput.js'

type NEATPopulation = Population<
  NEATNode,
  NEATLink,
  NEATConfig,
  NEATState,
  NEATGenomeOptions,
  DefaultNEATGenomeFactoryOptions,
  DefaultNEATGenomeData,
  DefaultNEATGenome,
  typeof NEATAlgorithm
>

describe('PopulationFactory', () => {
  let evaluator: AsyncEvaluator
  let algorithm: typeof NEATAlgorithm
  let configProvider: NEATConfig
  let population: NEATPopulation
  let populationOptions: PopulationOptions
  let genomeOptions: NEATGenomeOptions

  beforeEach(async () => {
    const datasetOptions = {
      ...defaultDatasetOptions,
      // dataset: new URL('./fixtures/iris-truncated', import.meta.url).pathname,
      dataset: new URL('../generated/iris', import.meta.url).pathname,
      validationFraction: 0.1,
      testFraction: 0.1,
    }

    const dataset = await loadDataset(datasetOptions)
    const environment = new DatasetEnvironment(dataset)
    evaluator = new AsyncEvaluator(environment, createExecutor)

    algorithm = NEATAlgorithm

    configProvider = algorithm.createConfig(defaultNEATConfigOptions)
    populationOptions = { ...defaultPopulationOptions }

    genomeOptions = {
      ...defaultNEATGenomeOptions,
      ...evaluator.environment.description,
    }
    // 1. Create a population
    population = new Population(
      evaluator,
      algorithm,
      configProvider,
      populationOptions,
      genomeOptions
    )

    const evolutionOptions = {
      ...defaultEvolutionOptions,
      secondsLimit: 1,
    }

    // 2. Mutate it 50 times
    for (let i = 0; i < 50; i++) {
      population.mutate()
    }

    // 3. Evolve it for 1 second
    await evolve(population, evolutionOptions)
  })

  test('population.toJSON', async () => {
    const data = population.toJSON()
    expect(data).toBeDefined()
    // const json = JSON.stringify(data, null, 2)
    // await fs.writeFile(
    //   new URL('./population.json', import.meta.url).pathname,
    //   json
    // )
  })

  test('population.best().toJSON', async () => {
    const data = population.best()?.toJSON()
    expect(data).toBeDefined()
    // const json = JSON.stringify(data, null, 2)
    // await fs.writeFile(
    //   new URL('./fixtures/organism.json', import.meta.url).pathname,
    //   json
    // )
  })

  test('population.toFactoryOptions', () => {
    const factoryOptions = population.toFactoryOptions()
    expect(factoryOptions).toBeDefined()
  })

  test('hydrate population from factoryOptions', () => {
    const factoryOptions = population.toFactoryOptions()
    const hydratedPopulation: NEATPopulation = new Population(
      evaluator,
      algorithm,
      configProvider,
      populationOptions,
      genomeOptions,
      factoryOptions
    )
    const data = population.toJSON()
    const hydratedData = hydratedPopulation.toJSON()
    expect(hydratedData.species).toEqual(data.species)
    expect(hydratedPopulation.toJSON()).toEqual(population.toJSON())
  })

  test('hydrate population from data', () => {
    const data = population.toJSON()
    const hydratedPopulation: NEATPopulation = new Population(
      evaluator,
      algorithm,
      configProvider,
      populationOptions,
      genomeOptions,
      data
    )
    const hydratedData = hydratedPopulation.toJSON()
    expect(hydratedData).toEqual(data)
  })

  test('hydrate genome from data', () => {
    const genome = new DefaultNEATGenome(
      configProvider,
      algorithm.createState(),
      genomeOptions,
      genomeFactoryOptions
    )
    expect(genome.toFactoryOptions()).toEqual(genomeFactoryOptions)
  })

  test('hydrate actions from data', async () => {
    const genome = new DefaultNEATGenome(
      configProvider,
      algorithm.createState(),
      genomeOptions,
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

    // phenotype
    const phenotype = algorithm.createPhenotype(genome)
    expect(phenotype.actions).toHaveLength(genomePhenotype.actions.length)

    // evaluate
    const fitnessResults: FitnessData[] = []
    for await (const fitnessData of evaluator.evaluate([[0, 0, phenotype]])) {
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
    const phenotype = algorithm.createPhenotype(genome)

    const factoryOptions = population.toFactoryOptions()
    const hydratedPopulation: NEATPopulation = new Population(
      evaluator,
      algorithm,
      configProvider,
      populationOptions,
      genomeOptions,
      factoryOptions
    )
    const hydratedGenome = hydratedPopulation.best()?.genome
    expect(hydratedGenome).toBeDefined()
    if (!hydratedGenome) {
      throw new Error('hydratedGenome is undefined')
    }
    const hydratedPhenotype = algorithm.createPhenotype(hydratedGenome)

    const phenotypeData: PhenotypeData = [0, 0, phenotype]
    const hydratedPhenotypeData: PhenotypeData = [1, 1, hydratedPhenotype]

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
