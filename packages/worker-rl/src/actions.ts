import type { ACAgentConfig } from '@neat-evolution/actor-critic'
import type { RolloutSegment } from '@neat-evolution/environment'
import type { QLAgentConfig } from '@neat-evolution/q-learning'

export interface RLTelemetryBase {
  /** Episodes completed during evaluation. */
  episodes: number
  /** Number of rollout segments trained this evaluation. */
  rolloutSegments: number
  /** Total transitions included in trained rollout segments. */
  transitionsTrained: number
}

export type RolloutTrigger = RolloutSegment['trigger']

export type TriggerCounts = Record<RolloutTrigger, number>

export interface ActorCriticTelemetry extends RLTelemetryBase {
  actorActivation: NonNullable<ACAgentConfig['actorActivation']>
  entropyCoefficient: number
  triggerCounts: TriggerCounts
  /**
   * Aggregated rollout-segment returns. Undefined if no rollout segments trained.
   */
  segmentReturn?: {
    mean: number
    min: number
    max: number
  }
  /**
   * Aggregated per-episode returns (EpisodeResult.episodeReturn).
   * Undefined when the environment never reported an episode return.
   */
  episodeReturn?: {
    mean: number
    min: number
    max: number
  }
  /**
   * Policy entropy summary (softmax activations only). Undefined otherwise.
   */
  policyEntropy?: {
    mean: number
    min: number
    max: number
    samples: number
  }
}

export interface QLearningTelemetry extends RLTelemetryBase {
  epsilonInitial: number
  epsilonFinal: number
  epsilonDecayPerEpisode: number
  epsilonMinimum: number
  multiDiscrete: boolean
}

/** Training config sent once during worker init via pluginData.
 *  Consumed by the worker RL plugin to configure handleEvaluateGenome enhancement. */
export type RLTrainingConfig =
  | {
      method: 'actor-critic'
      isLamarckian: boolean
      config: ACAgentConfig
    }
  | {
      method: 'q-learning'
      isLamarckian: boolean
      config: QLAgentConfig
    }
