import { defaultSpeciesOptions, type SpeciesOptions } from './SpeciesOptions.js'

export interface PopulationOptions extends SpeciesOptions {
  populationSize: number
  speciesTarget: number
  speciationThresholdMoveAmount: number
  asexualReproductionProbability: number
  interspeciesReproductionProbability: number
  tournamentSize: number
  interspeciesTournamentSize: number
  globalElites: number
  elitesFromOffspring: number
}

export const defaultPopulationOptions: PopulationOptions = {
  ...defaultSpeciesOptions,
  populationSize: 100,
  speciesTarget: 8,
  speciationThresholdMoveAmount: 0.05,
  asexualReproductionProbability: 0.25,
  interspeciesReproductionProbability: 0.001,
  tournamentSize: 2,
  interspeciesTournamentSize: 2,
  globalElites: 1,
  elitesFromOffspring: 1,
}
