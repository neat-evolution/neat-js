import type { ACAgent, ACAgentConfig } from '@neat-evolution/actor-critic'
import { createACAgent } from '@neat-evolution/actor-critic'
import { createTrainableExecutor } from '@neat-evolution/backprop'
import type {
  AnyAlgorithm,
  AnyGenome,
  PhenotypeAction,
} from '@neat-evolution/core'
import type {
  EpisodeInfo,
  EpisodeResult,
  EpisodicAgent,
  EpisodicContext,
  RolloutBufferConfig,
  RolloutSegment,
  TransitionInfo,
} from '@neat-evolution/environment'
import {
  type AgentEnvironment,
  type EpisodicEnvironment,
  isAgentEnvironment,
  isEpisodicEnvironment,
  type RLConfig,
} from '@neat-evolution/environment'
import type {
  EvaluationContext,
  EvaluationPlugin,
  EvaluationResult,
  PluginContext,
} from '@neat-evolution/evaluation-strategy'
import type { Executor } from '@neat-evolution/executor'
import type {
  ActorCriticWorkerTelemetry,
  TriggerCounts,
} from '@neat-evolution/worker-rl'

/**
 * Create a lightweight telemetry tracker for local AC evaluation.
 * Mirrors the worker-side tracker so local and worker runs produce
 * comparable diagnostics in the same `ActorCriticWorkerTelemetry` shape.
 */
function createLocalTelemetryTracker(trackEntropy: boolean) {
  let episodes = 0
  let segments = 0
  let transitions = 0

  const triggerCounts: TriggerCounts = { reward: 0, done: 0, info: 0 }

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

  return {
    onSegmentTrained(segment: RolloutSegment): void {
      segments += 1
      transitions += segment.transitions.length
      triggerCounts[segment.trigger] += 1

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
    onEpisodeStart(_info: EpisodeInfo): void {
      episodes += 1
    },
    onEpisodeEnd(result: EpisodeResult): void {
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
    toTelemetry(config: ACAgentConfig): ActorCriticWorkerTelemetry {
      const segmentReturn =
        segments > 0
          ? {
              mean: segmentReturnSum / segments,
              min: segmentReturnMin,
              max: segmentReturnMax,
            }
          : undefined
      const episodeReturn =
        episodeReturnCount > 0
          ? {
              mean: episodeReturnSum / episodeReturnCount,
              min: episodeReturnMin,
              max: episodeReturnMax,
            }
          : undefined
      const policyEntropy =
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
        ...(policyEntropy != null ? { policyEntropy } : {}),
      }
    },
  }
}

/** Wrap agent episode lifecycle to route events through a tracker. */
function attachLocalEpisodeTracker(
  agent: EpisodicAgent,
  tracker: {
    onEpisodeStart: (info: EpisodeInfo) => void
    onEpisodeEnd: (result: EpisodeResult) => void
  }
): void {
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

export interface ACPluginOptions {
  /** Learning rate for backward pass. */
  learningRate: number
  /** Discount factor (overrides environment's RLConfig if set). */
  discountFactor?: number
  /** Entropy coefficient for exploration. Default: 0.01 */
  entropyCoefficient?: number
  /** Whether to clip gradients. Default: false */
  clipGradients?: boolean
  /** Max gradient magnitude. Default: 1.0 */
  gradientClipValue?: number

  /** Rollout length. Default: 32 or environment's suggestedRolloutLength. */
  rolloutLength?: number | 'episode'
  /** Minimum rollout length to prevent tiny segments. */
  minRolloutLength?: number
  /** Minimum |reward| to trigger capture. Default: 0.1 */
  rewardThreshold?: number

  /** Output activation for actor outputs. Default: 'softmax' */
  actorActivation?: 'sigmoid' | 'softmax' | 'tanh'

  /** Write learned weights back to genome. Default: true */
  isLamarckian?: boolean
}

/**
 * EvaluationPlugin that trains genomes via Actor-Critic during evaluation.
 *
 * Worker path: The plugin provides training config via getWorkerPluginData().
 * The worker RL plugin enhances handleEvaluateGenome to create trainable
 * executors and AC agents internally. The evaluator handles writeback.
 * The plugin just delegates to defaultEvaluate().
 *
 * Local path: The plugin creates the AC agent and evaluates directly.
 * Lamarckian writeback is handled via afterFitness().
 *
 * Context hooks remain as a partial integration surface for environments
 * that evaluate plain executors (local path only).
 */
export class ACPlugin<G extends AnyGenome = AnyGenome>
  implements EvaluationPlugin<G>
{
  readonly mode = 'augmentation'
  private readonly algorithm: AnyAlgorithm
  private readonly options: ACPluginOptions
  private readonly rng: () => number
  private episodicEnvironment:
    | (EpisodicEnvironment & Partial<AgentEnvironment>)
    | undefined
  private rlConfig: RLConfig | undefined

  /** Current AC agent for getContextHooks() delegation. */
  private currentAgent: ACAgent | null = null

  /** Tracks updated actions per genome for local writeback in afterFitness. */
  private readonly pendingWritebacks = new Map<G, PhenotypeAction[]>()
  /** Latest telemetry keyed by genome (local evaluation only). */
  private readonly localTelemetryByGenome = new WeakMap<
    G,
    ActorCriticWorkerTelemetry
  >()

  constructor(
    algorithm: AnyAlgorithm,
    options: ACPluginOptions,
    rng: () => number
  ) {
    this.algorithm = algorithm
    this.options = options
    this.rng = rng
  }

  initialize(context: PluginContext): void {
    if (!isEpisodicEnvironment(context.environment)) {
      throw new Error('ACPlugin requires an EpisodicEnvironment')
    }
    this.episodicEnvironment = context.environment
    this.rlConfig = context.environment.getRLConfig()
  }

  getWorkerPluginData(): Record<string, unknown> {
    if (this.rlConfig == null) {
      return {}
    }
    return {
      rl: {
        method: 'actor-critic' as const,
        isLamarckian: this.options.isLamarckian ?? true,
        config: this.buildAgentConfig(this.rlConfig),
      },
    }
  }

  async evaluateGenome(
    genome: G,
    defaultEvaluate: (genome: G) => Promise<number>,
    context: EvaluationContext<G>
  ): Promise<EvaluationResult> {
    if (this.episodicEnvironment === undefined || this.rlConfig === undefined) {
      throw new Error('ACPlugin not initialized — call initialize() first')
    }

    // Worker path: training is handled by the worker evaluation enhancer.
    // Just delegate to defaultEvaluate which routes through evaluateGenomeEntry.
    // The evaluator extracts writeback and telemetry from the enriched response.
    if (
      context.workerTrainingCapabilities?.rl?.methods?.['actor-critic']
        ?.supported === true
    ) {
      const fitness = await defaultEvaluate(genome)
      return { fitness }
    }

    // Local path: create agent and evaluate directly
    return await this.evaluateLocally(
      genome,
      defaultEvaluate,
      this.rlConfig,
      this.options.isLamarckian ?? true
    )
  }

  private async evaluateLocally(
    genome: G,
    defaultEvaluate: (genome: G) => Promise<number>,
    rlConfig: RLConfig,
    isLamarckian: boolean
  ): Promise<EvaluationResult> {
    const phenotype = this.algorithm.createPhenotype(genome)
    const trainable = createTrainableExecutor(phenotype)
    const agentConfig = this.buildAgentConfig(rlConfig)

    const trackEntropy =
      (agentConfig.actorActivation ?? 'sigmoid') === 'softmax'
    const tracker = createLocalTelemetryTracker(trackEntropy)

    const agent = createACAgent(
      trainable,
      { ...agentConfig, onSegmentTrained: tracker.onSegmentTrained },
      this.rng
    )
    attachLocalEpisodeTracker(agent, tracker)
    this.currentAgent = agent

    let fitness: number
    if (isAgentEnvironment(this.episodicEnvironment)) {
      fitness = this.episodicEnvironment.evaluateAgent(agent)
    } else {
      fitness = await defaultEvaluate(genome)
    }

    if (isLamarckian) {
      this.pendingWritebacks.set(genome, trainable.getUpdatedActions())
    }

    this.localTelemetryByGenome.set(genome, tracker.toTelemetry(agentConfig))
    this.currentAgent = null
    return { fitness }
  }

  private buildAgentConfig(
    rlConfig: RLConfig
  ): import('@neat-evolution/actor-critic').ACAgentConfig {
    const rolloutConfig = this.buildRolloutConfig(rlConfig)
    return {
      learningRate: this.options.learningRate,
      actionCount: rlConfig.actionSize,
      gradientConfig: {
        discountFactor: this.options.discountFactor ?? rlConfig.discountFactor,
        entropyCoefficient: this.options.entropyCoefficient ?? 0.01,
        clipGradients: this.options.clipGradients ?? false,
        gradientClipValue: this.options.gradientClipValue ?? 1.0,
      },
      rolloutConfig,
      actorActivation: this.options.actorActivation ?? 'softmax',
    }
  }

  private buildRolloutConfig(rlConfig: RLConfig): RolloutBufferConfig {
    const rolloutLength =
      this.options.rolloutLength ?? rlConfig.suggestedRolloutLength ?? 32
    const rolloutConfig: RolloutBufferConfig = {
      rolloutLength,
      rewardThreshold: this.options.rewardThreshold ?? 0.1,
    }
    if (this.options.minRolloutLength !== undefined) {
      rolloutConfig.minRolloutLength = this.options.minRolloutLength
    }
    return rolloutConfig
  }

  getContextHooks(): Partial<EpisodicContext> {
    return {
      reward: (_executor: Executor, reward: number, done: boolean): void => {
        this.currentAgent?.reward(reward, done)
      },
      episodeStart: (_executor: Executor, info: EpisodeInfo): void => {
        this.currentAgent?.startEpisode(info)
      },
      episodeEnd: (_executor: Executor, result: EpisodeResult): void => {
        this.currentAgent?.endEpisode(result)
      },
      transitionInfo: (_executor: Executor, info: TransitionInfo): void => {
        this.currentAgent?.setTransitionInfo(info)
      },
    }
  }

  /** Retrieve the latest telemetry for a genome (local evaluation only).
   *  For worker evaluation, telemetry is available via WorkerEvaluator.getTelemetry(). */
  getTelemetry(genome: G): ActorCriticWorkerTelemetry | undefined {
    return this.localTelemetryByGenome.get(genome)
  }

  /** Apply Lamarckian writeback for local evaluation path only.
   *  Worker path writebacks are handled by WorkerEvaluator. */
  afterFitness(genome: G, _fitness: number, _context: PluginContext): void {
    const updatedActions = this.pendingWritebacks.get(genome)
    if (updatedActions) {
      this.algorithm.writeBackWeights(genome, updatedActions)
      this.pendingWritebacks.delete(genome)
    }
  }
}
