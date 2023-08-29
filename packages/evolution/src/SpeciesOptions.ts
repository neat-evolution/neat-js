export interface SpeciesOptions {
  speciationThreshold: number
  dropoffAge: number
  youngSpeciesFitnessMultiplier: number
  youngAgeLimit: number
  stagnantSpeciesFitnessMultiplier: number
  survivalRatio: number
  guaranteedElites: number
}

export const defaultSpeciesOptions: SpeciesOptions = {
  speciationThreshold: 0.8,
  dropoffAge: 20,
  youngSpeciesFitnessMultiplier: 1.01,
  youngAgeLimit: 20,
  stagnantSpeciesFitnessMultiplier: 0.2,
  survivalRatio: 0.2,
  guaranteedElites: 0,
}
