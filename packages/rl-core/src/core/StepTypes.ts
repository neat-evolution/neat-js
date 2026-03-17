export interface StepEpisodeInfo {
  episodeIndex: number
  type?: string
  phase?: string
  metadata?: Record<string, unknown>
}

export interface StepEpisodeResult {
  fitness: number
  episodeReturn: number
  totalSteps: number
  terminated: boolean
  truncated?: boolean
  metadata?: Record<string, unknown>
}

export interface BaseStepOutcome<Info = unknown> {
  reward: number
  nextState: Float64Array
  terminated: boolean
  truncated: boolean
  info?: Info
}

export interface BaseOpenStep<Info = unknown> {
  state: Float64Array
  rawOutput: Float64Array
  action: Float64Array
  info?: Info
}

export interface BaseStepTransition<Info = unknown> {
  state: Float64Array
  rawOutput: Float64Array
  action: Float64Array
  reward: number
  nextState: Float64Array
  terminated: boolean
  truncated: boolean
  info?: Info
}

export type StepOutcome<Info = unknown> = BaseStepOutcome<Info>
export type OpenStep<Info = unknown> = BaseOpenStep<Info>
export type StepTransition<Info = unknown> = BaseStepTransition<Info>
