import type { StaticExecutor } from '@neat-evolution/executor'
import type { StatsRecorder } from '@neat-evolution/stats'
import type { RNG } from '@neat-evolution/utils'
import type {
  StepEpisodeInfo,
  StepEpisodeResult,
  StepOutcome,
} from './StepTypes.js'

export interface StepAgent {
  act(observation: Float64Array): Float64Array
  completeStep(outcome: StepOutcome): void
  startEpisode(info: StepEpisodeInfo): void
  endEpisode(result: StepEpisodeResult): void
}

export interface StepAgentContext {
  rng: RNG
  stats?: StatsRecorder
  scheduleWriteback?(executor: StaticExecutor): void
  onFitness?(callback: (fitness: number) => void): void
  executorMap?: ReadonlyMap<StaticExecutor, unknown>
}
