import { createACAgent } from '@neat-evolution/actor-critic'
import type { TrainableExecutor } from '@neat-evolution/backprop'
import { createTrainableExecutor } from '@neat-evolution/backprop'
import type { GenomeFactoryOptions, Phenotype } from '@neat-evolution/core'
import type {
  EpisodeInfo,
  EpisodeResult,
  EpisodicAgent,
  RolloutSegment,
} from '@neat-evolution/environment'
import { isAgentEnvironment } from '@neat-evolution/environment'
import { createQLAgent } from '@neat-evolution/q-learning'
import type { RNG } from '@neat-evolution/utils'
import { createRNG, threadRNG } from '@neat-evolution/utils'
import type { Handler, WorkerContext } from '@neat-evolution/worker-actions'
import type { ThreadContext } from '@neat-evolution/worker-evaluator/worker'

import {
  type ActorCriticWorkerTelemetry,
  type EvaluateACAgentPayload,
  type EvaluateQLAgentPayload,
  type EvaluateRLAgentPayload,
  type EvaluateRLAgentResult,
  type QLearningWorkerTelemetry,
  RLWorkerActionType,
  type TriggerCounts,
} from './actions.js'

interface TelemetryTracker {
  onSegmentTrained: (segment: RolloutSegment) => void
  onEpisodeStart: (info: EpisodeInfo) => void
  onEpisodeEnd: (result: EpisodeResult) => void
  toActorCriticTelemetry(
    config: EvaluateACAgentPayload['config']
  ): ActorCriticWorkerTelemetry
  toQLearningTelemetry(
    config: EvaluateQLAgentPayload['config']
  ): QLearningWorkerTelemetry
}

interface TelemetryTrackerOptions {
  trackEntropy?: boolean
}

const createTelemetryTracker = (
  options?: TelemetryTrackerOptions
): TelemetryTracker => {
  let episodes = 0
  let segments = 0
  let transitions = 0

  const triggerCounts: TriggerCounts = {
    reward: 0,
    done: 0,
    info: 0,
    'prediction-error': 0,
  }

  let segmentReturnSum = 0
  let segmentReturnMin = Number.POSITIVE_INFINITY
  let segmentReturnMax = Number.NEGATIVE_INFINITY

  let episodeReturnSum = 0
  let episodeReturnCount = 0
  let episodeReturnMin = Number.POSITIVE_INFINITY
  let episodeReturnMax = Number.NEGATIVE_INFINITY

  let entropySum = 0
  let entropySamples = 0
  let entropyMin = Number.POSITIVE_INFINITY
  let entropyMax = Number.NEGATIVE_INFINITY

  const trackEntropy = options?.trackEntropy === true

  const recordEntropy = (probabilities?: Float64Array): void => {
    if (!trackEntropy || probabilities == null || probabilities.length === 0) {
      return
    }
    let entropy = 0
    for (let i = 0; i < probabilities.length; i++) {
      const prob = probabilities[i] as number
      if (prob <= 0) {
        continue
      }
      entropy -= prob * Math.log(prob)
    }
    if (!Number.isFinite(entropy)) {
      return
    }
    entropySum += entropy
    entropySamples += 1
    if (entropy < entropyMin) {
      entropyMin = entropy
    }
    if (entropy > entropyMax) {
      entropyMax = entropy
    }
  }

  const finalizeRange = (
    count: number,
    sum: number,
    min: number,
    max: number
  ):
    | {
        mean: number
        min: number
        max: number
      }
    | undefined => {
    if (count === 0) {
      return undefined
    }
    return {
      mean: sum / count,
      min,
      max,
    }
  }

  return {
    onSegmentTrained(segment: RolloutSegment) {
      segments += 1
      transitions += segment.transitions.length
      triggerCounts[segment.trigger] = (triggerCounts[segment.trigger] ?? 0) + 1

      let segmentReturn = 0
      for (const transition of segment.transitions) {
        segmentReturn += transition.reward
        recordEntropy(transition.actionProbabilities)
      }
      segmentReturnSum += segmentReturn
      if (segmentReturn < segmentReturnMin) {
        segmentReturnMin = segmentReturn
      }
      if (segmentReturn > segmentReturnMax) {
        segmentReturnMax = segmentReturn
      }
    },
    onEpisodeStart(_info: EpisodeInfo) {
      episodes += 1
    },
    onEpisodeEnd(result: EpisodeResult) {
      if (typeof result.episodeReturn === 'number') {
        episodeReturnSum += result.episodeReturn
        episodeReturnCount += 1
        if (result.episodeReturn < episodeReturnMin) {
          episodeReturnMin = result.episodeReturn
        }
        if (result.episodeReturn > episodeReturnMax) {
          episodeReturnMax = result.episodeReturn
        }
      }
    },
    toActorCriticTelemetry(config) {
      const segmentReturn = finalizeRange(
        segments,
        segmentReturnSum,
        segmentReturnMin,
        segmentReturnMax
      )
      const episodeReturn = finalizeRange(
        episodeReturnCount,
        episodeReturnSum,
        episodeReturnMin,
        episodeReturnMax
      )
      const policyEntropySummary =
        trackEntropy && entropySamples > 0
          ? {
              mean: entropySum / entropySamples,
              min: entropyMin,
              max: entropyMax,
              samples: entropySamples,
            }
          : undefined

      return {
        episodes,
        rolloutSegments: segments,
        transitionsTrained: transitions,
        actorActivation: config.actorActivation ?? 'sigmoid',
        entropyCoefficient: config.gradientConfig.entropyCoefficient,
        triggerCounts: { ...triggerCounts },
        ...(segmentReturn != null ? { segmentReturn } : {}),
        ...(episodeReturn != null ? { episodeReturn } : {}),
        ...(policyEntropySummary != null
          ? { policyEntropy: policyEntropySummary }
          : {}),
      }
    },
    toQLearningTelemetry(config) {
      const epsilonDecayPerEpisode = config.epsilonDecayPerEpisode ?? 1
      const epsilonMinimum = config.epsilonMinimum ?? 0
      const epsilonInitial = config.epsilonInitial
      const decaySteps = Math.max(0, episodes - 1)
      const epsilonFinal = Math.max(
        epsilonMinimum,
        epsilonInitial * epsilonDecayPerEpisode ** decaySteps
      )

      return {
        episodes,
        rolloutSegments: segments,
        transitionsTrained: transitions,
        epsilonInitial,
        epsilonFinal,
        epsilonDecayPerEpisode,
        epsilonMinimum,
        multiDiscrete: config.multiDiscrete ?? false,
      }
    },
  }
}

const hydrateTrainable = (
  genomeOptions: GenomeFactoryOptions,
  context: ThreadContext
): TrainableExecutor => {
  const { threadInfo, genomeFactoryConfig } = context
  if (threadInfo == null) {
    throw new Error('Worker not initialized: threadInfo missing')
  }
  if (genomeFactoryConfig == null) {
    throw new Error('Worker not initialized: genomeFactoryConfig missing')
  }

  const genome = threadInfo.createGenome(
    genomeFactoryConfig.configProvider,
    genomeFactoryConfig.stateProvider as never,
    genomeFactoryConfig.genomeOptions,
    genomeFactoryConfig.initConfig,
    genomeOptions
  )
  const phenotype = threadInfo.createPhenotype(genome as never) as Phenotype
  return createTrainableExecutor(phenotype)
}

const ensureAgentEnvironment = (
  context: ThreadContext
): import('@neat-evolution/environment').Environment &
  import('@neat-evolution/environment').AgentEnvironment => {
  const env = context.threadInfo?.environment
  if (env == null || !isAgentEnvironment(env)) {
    throw new Error(
      'Worker environment must implement AgentEnvironment for RL evaluation'
    )
  }
  return env as import('@neat-evolution/environment').Environment &
    import('@neat-evolution/environment').AgentEnvironment
}

const attachEpisodeTracker = (
  agent: EpisodicAgent,
  tracker: TelemetryTracker
): void => {
  const originalStart = agent.startEpisode.bind(agent)
  agent.startEpisode = (info) => {
    tracker.onEpisodeStart(info)
    originalStart(info)
  }

  const originalEnd = agent.endEpisode.bind(agent)
  agent.endEpisode = (result) => {
    tracker.onEpisodeEnd(result)
    originalEnd(result)
  }
}

const evaluateActorCritic = (
  payload: EvaluateACAgentPayload,
  context: ThreadContext,
  rng: RNG
): EvaluateRLAgentResult => {
  const trainable = hydrateTrainable(payload.genomeOptions, context)
  const trackEntropy =
    (payload.config.actorActivation ?? 'sigmoid') === 'softmax'
  const tracker = createTelemetryTracker({ trackEntropy })

  const agent = createACAgent(
    trainable,
    {
      ...payload.config,
      onSegmentTrained: tracker.onSegmentTrained,
    },
    rng.gen
  )
  attachEpisodeTracker(agent, tracker)

  const env = ensureAgentEnvironment(context)
  const fitness = env.evaluateAgent(agent)

  const result: EvaluateRLAgentResult = {
    method: 'actor-critic',
    fitness,
    telemetry: tracker.toActorCriticTelemetry(payload.config),
  }
  if (payload.isLamarckian) {
    result.updatedActions = trainable.getUpdatedActions()
  }
  return result
}

const evaluateQLearning = (
  payload: EvaluateQLAgentPayload,
  context: ThreadContext,
  rng: RNG
): EvaluateRLAgentResult => {
  const trainable = hydrateTrainable(payload.genomeOptions, context)
  const tracker = createTelemetryTracker()

  const agent = createQLAgent(
    trainable,
    {
      ...payload.config,
      onSegmentTrained: tracker.onSegmentTrained,
    },
    rng
  )
  attachEpisodeTracker(agent, tracker)

  const env = ensureAgentEnvironment(context)
  const fitness = env.evaluateAgent(agent)

  const result: EvaluateRLAgentResult = {
    method: 'q-learning',
    fitness,
    telemetry: tracker.toQLearningTelemetry(payload.config),
  }
  if (payload.isLamarckian) {
    result.updatedActions = trainable.getUpdatedActions()
  }
  return result
}

const workerRLPlugin = (
  handler: Handler,
  threadContext: ThreadContext & WorkerContext
): void => {
  handler.register(
    RLWorkerActionType.REQUEST_EVALUATE_AGENT,
    async (payload) => {
      const rlPayload = payload as EvaluateRLAgentPayload
      const rng =
        rlPayload.seed != null ? createRNG(rlPayload.seed) : threadRNG()

      if (rlPayload.method === 'actor-critic') {
        return evaluateActorCritic(rlPayload, threadContext, rng)
      }
      return evaluateQLearning(rlPayload, threadContext, rng)
    }
  )
}

export default workerRLPlugin
