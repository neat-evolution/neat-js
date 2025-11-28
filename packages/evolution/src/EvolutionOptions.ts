import type { Organism } from './Organism.js'
import type { Population } from './Population.js'

export interface EvolutionOptions<
  P extends Population<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
  O extends Organism<any, any, any, any, any, any, any>,
> {
  threadCount: number
  iterations: number
  initialMutations: number
  secondsLimit: number
  logInterval: number
  logSecInterval: number
  earlyStop: boolean
  earlyStopPatience: number
  earlyStopMinThreshold: number
  afterEvaluate?: (population: P, iteration: number) => void
  afterEvaluateInterval?: number
  handleNewBest?: (organism: O, iteration: number) => void
  afterEvolve?: (population: P, iteration: number) => void
  afterEvolveInterval?: number
  signal?: AbortSignal
}

export const defaultEvolutionOptions: EvolutionOptions<
  Population<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
  Organism<any, any, any, any, any, any, any>
> = {
  threadCount: 0,
  iterations: 100,
  initialMutations: 100,
  secondsLimit: 0,
  logInterval: 10,
  logSecInterval: 0,
  earlyStop: false,
  earlyStopPatience: 10,
  earlyStopMinThreshold: 0,
  afterEvaluateInterval: 1,
  afterEvolveInterval: 1,
}
