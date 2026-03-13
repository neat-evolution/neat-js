import { createACAgent } from '@neat-evolution/actor-critic'
import type { TrainableExecutor } from '@neat-evolution/backprop'
import { createTrainableExecutor } from '@neat-evolution/backprop'
import type { GenomeFactoryOptions, Phenotype } from '@neat-evolution/core'
import type { EpisodicAgent, RolloutSegment } from '@neat-evolution/environment'
import { isAgentEnvironment } from '@neat-evolution/environment'
import { createQLAgent } from '@neat-evolution/q-learning'
import { createRNG } from '@neat-evolution/utils'
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
} from './actions.js'

interface TelemetryTracker {
  onSegmentTrained: (segment: RolloutSegment) => void
  onEpisodeStart: () => void
  toActorCriticTelemetry(
    config: EvaluateACAgentPayload['config']
  ): ActorCriticWorkerTelemetry
  toQLearningTelemetry(
    config: EvaluateQLAgentPayload['config']
  ): QLearningWorkerTelemetry
}

const createTelemetryTracker = (): TelemetryTracker => {
  let episodes = 0
  let segments = 0
  let transitions = 0

  return {
    onSegmentTrained(segment: RolloutSegment) {
      segments += 1
      transitions += segment.transitions.length
    },
    onEpisodeStart() {
      episodes += 1
    },
    toActorCriticTelemetry(config) {
      return {
        episodes,
        rolloutSegments: segments,
        transitionsTrained: transitions,
        actorActivation: config.actorActivation ?? 'sigmoid',
        entropyCoefficient: config.gradientConfig.entropyCoefficient,
      }
    },
    toQLearningTelemetry(config) {
      const epsilonDecay = config.epsilonDecay ?? 1
      const epsilonMin = config.epsilonMin ?? 0
      const epsilonInitial = config.epsilon
      const epsilonFinal = Math.max(
        epsilonMin,
        epsilonInitial * epsilonDecay ** episodes
      )

      return {
        episodes,
        rolloutSegments: segments,
        transitionsTrained: transitions,
        epsilonInitial,
        epsilonFinal,
        epsilonDecay,
        epsilonMin,
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
    tracker.onEpisodeStart()
    originalStart(info)
  }
}

const evaluateActorCritic = (
  payload: EvaluateACAgentPayload,
  context: ThreadContext,
  rng: () => number
): EvaluateRLAgentResult => {
  const trainable = hydrateTrainable(payload.genomeOptions, context)
  const tracker = createTelemetryTracker()

  const agent = createACAgent(
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
  rng: () => number
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
        rlPayload.seed != null ? createRNG(rlPayload.seed).gen : Math.random

      if (rlPayload.method === 'actor-critic') {
        return evaluateActorCritic(rlPayload, threadContext, rng)
      }
      return evaluateQLearning(rlPayload, threadContext, rng)
    }
  )
}

export default workerRLPlugin
