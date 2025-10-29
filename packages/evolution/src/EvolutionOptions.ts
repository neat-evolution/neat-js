export interface EvolutionOptions {
  threadCount: number
  iterations: number
  initialMutations: number
  secondsLimit: number
  logInterval: number
  logSecInterval: number
  earlyStop: boolean
  earlyStopPatience: number
  earlyStopMinThreshold: number
}

export const defaultEvolutionOptions: EvolutionOptions = {
  threadCount: 0,
  iterations: 100,
  initialMutations: 100,
  secondsLimit: 0,
  logInterval: 10,
  logSecInterval: 0,
  earlyStop: false,
  earlyStopPatience: 10,
  earlyStopMinThreshold: 0,
}
