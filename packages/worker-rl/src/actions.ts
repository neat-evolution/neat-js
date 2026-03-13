import type { ACAgentConfig } from '@neat-evolution/actor-critic'
import type {
  GenomeFactoryOptions,
  PhenotypeAction,
} from '@neat-evolution/core'
import type { QLAgentConfig } from '@neat-evolution/q-learning'
import { createMessage } from '@neat-evolution/worker-actions'

export enum RLWorkerActionType {
  REQUEST_EVALUATE_AGENT = 'REQUEST_EVALUATE_AGENT',
}

type BaseEvaluatePayload = {
  genomeOptions: GenomeFactoryOptions
  /** Deterministic RNG seed forwarded to worker-level RNG. */
  seed?: string
  /** Whether the worker should return updated weights for Lamarckian writeback. */
  isLamarckian: boolean
}

export interface EvaluateACAgentPayload extends BaseEvaluatePayload {
  method: 'actor-critic'
  config: ACAgentConfig
}

export interface EvaluateQLAgentPayload extends BaseEvaluatePayload {
  method: 'q-learning'
  config: QLAgentConfig
}

export type EvaluateRLAgentPayload =
  | EvaluateACAgentPayload
  | EvaluateQLAgentPayload

export interface RLWorkerTelemetryBase {
  /** Episodes completed during evaluation. */
  episodes: number
  /** Number of rollout segments trained this evaluation. */
  rolloutSegments: number
  /** Total transitions included in trained rollout segments. */
  transitionsTrained: number
}

export interface ActorCriticWorkerTelemetry extends RLWorkerTelemetryBase {
  actorActivation: NonNullable<ACAgentConfig['actorActivation']>
  entropyCoefficient: number
}

export interface QLearningWorkerTelemetry extends RLWorkerTelemetryBase {
  epsilonInitial: number
  epsilonFinal: number
  epsilonDecay: number
  epsilonMin: number
  multiDiscrete: boolean
}

export type EvaluateRLAgentResult =
  | {
      method: 'actor-critic'
      fitness: number
      updatedActions?: PhenotypeAction[]
      telemetry: ActorCriticWorkerTelemetry
    }
  | {
      method: 'q-learning'
      fitness: number
      updatedActions?: PhenotypeAction[]
      telemetry: QLearningWorkerTelemetry
    }

export const requestEvaluateRLAgent = createMessage<
  EvaluateRLAgentPayload,
  EvaluateRLAgentResult
>(RLWorkerActionType.REQUEST_EVALUATE_AGENT)
