export interface EvolutionOptions {
  threadCount: number
  iterations: number
  initialMutations: number
  secondsLimit: number
  logInterval: number
  logSecInterval: number
}

export const defaultEvolutionOptions: EvolutionOptions = {
  threadCount: 0,
  iterations: 10000,
  initialMutations: 100,
  secondsLimit: 0,
  logInterval: 10,
  logSecInterval: 0,
}
