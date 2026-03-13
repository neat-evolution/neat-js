import type { ACAgent, ACAgentConfig } from '@neat-evolution/actor-critic'
import { createACAgent } from '@neat-evolution/actor-critic'
import { createTrainableExecutor } from '@neat-evolution/backprop'
import type {
  AnyAlgorithm,
  AnyGenome,
  GenomeFactoryOptions,
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
import {
  type ActorCriticWorkerTelemetry,
  type EvaluateRLAgentResult,
  requestEvaluateRLAgent,
  type TriggerCounts,
  WorkerRLDispatchError,
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
 * The primary RL path is direct agent evaluation: when the environment
 * implements AgentEnvironment, the plugin passes the AC agent directly so
 * the agent owns action selection, transition recording, and training.
 *
 * The context-hook path remains as a partial integration surface for
 * environments that still evaluate plain executors.
 *
 * Lamarckian writeback is handled via afterFitness(): trained weights are written
 * back to the genome after fitness is assigned.
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

  /** Tracks updated actions per genome for writeback in afterFitness. */
  private readonly pendingWritebacks = new Map<G, PhenotypeAction[]>()
  /** Latest worker telemetry keyed by genome for debugging/metrics. */
  private readonly telemetryByGenome = new WeakMap<
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

  async evaluateGenome(
    genome: G,
    defaultEvaluate: (genome: G) => Promise<number>,
    context: EvaluationContext<G>
  ): Promise<EvaluationResult> {
    if (this.episodicEnvironment === undefined || this.rlConfig === undefined) {
      throw new Error('ACPlugin not initialized — call initialize() first')
    }

    const rlConfig = this.rlConfig
    const isLamarckian = this.options.isLamarckian ?? true

    const wantsWorker = context.supportsTraining === true

    if (wantsWorker) {
      if (!isAgentEnvironment(this.episodicEnvironment)) {
        throw new WorkerRLDispatchError(
          'agent-environment-required',
          'actor-critic',
          'Actor-Critic worker evaluation requires an AgentEnvironment so the agent can run inside the worker.'
        )
      }
      const rlCapabilities = context.workerTrainingCapabilities?.rl
      if (rlCapabilities == null) {
        throw new WorkerRLDispatchError(
          'capability-missing',
          'actor-critic',
          'Worker RL capabilities were not reported during worker initialization.'
        )
      }
      if (rlCapabilities.supported !== true) {
        throw new WorkerRLDispatchError(
          'capability-missing',
          'actor-critic',
          rlCapabilities.reason ??
            'Worker RL plugin is not registered on every worker thread.'
        )
      }
      const methodCapability = rlCapabilities.methods?.['actor-critic']
      if (methodCapability == null || methodCapability.supported !== true) {
        throw new WorkerRLDispatchError(
          'method-unsupported',
          'actor-critic',
          methodCapability?.reason ??
            'Worker RL plugin does not support actor-critic evaluation.'
        )
      }
      if (
        isLamarckian &&
        methodCapability.supportsLamarckianWriteback === false
      ) {
        throw new WorkerRLDispatchError(
          'lamarckian-unsupported',
          'actor-critic',
          'Worker RL plugin disabled Lamarckian writeback for actor-critic evaluations.'
        )
      }
    }

    const canUseWorker = wantsWorker

    if (canUseWorker) {
      return await this.evaluateInWorker(
        genome,
        rlConfig,
        isLamarckian,
        context
      )
    }

    return await this.evaluateLocally(
      genome,
      defaultEvaluate,
      rlConfig,
      isLamarckian
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

    this.telemetryByGenome.set(genome, tracker.toTelemetry(agentConfig))
    this.currentAgent = null
    return { fitness }
  }

  private async evaluateInWorker(
    genome: G,
    rlConfig: RLConfig,
    isLamarckian: boolean,
    context: EvaluationContext<G>
  ): Promise<EvaluationResult> {
    const genomeOptions = genome.toFactoryOptions()
    const payload = requestEvaluateRLAgent({
      method: 'actor-critic',
      genomeOptions,
      isLamarckian,
      seed: computeFactorySeed(genomeOptions),
      config: this.buildAgentConfig(rlConfig),
    })
    let result: EvaluateRLAgentResult
    try {
      result = (await context.call(payload)) as EvaluateRLAgentResult
    } catch (error) {
      throw new WorkerRLDispatchError(
        'worker-call-failed',
        'actor-critic',
        'Worker RL actor-critic evaluation failed.',
        { cause: error instanceof Error ? error : undefined }
      )
    }
    if (result.method !== 'actor-critic') {
      throw new WorkerRLDispatchError(
        'result-mismatch',
        'actor-critic',
        `Worker returned mismatched RL method result: ${result.method}`
      )
    }

    if (isLamarckian && result.updatedActions) {
      this.pendingWritebacks.set(genome, result.updatedActions)
    }
    this.telemetryByGenome.set(genome, result.telemetry)
    return { fitness: result.fitness }
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

  /** Retrieve the latest telemetry for a genome (local or worker). */
  getTelemetry(genome: G): ActorCriticWorkerTelemetry | undefined {
    return this.telemetryByGenome.get(genome)
  }

  afterFitness(genome: G, _fitness: number, _context: PluginContext): void {
    const updatedActions = this.pendingWritebacks.get(genome)
    if (updatedActions) {
      this.algorithm.writeBackWeights(genome, updatedActions)
      this.pendingWritebacks.delete(genome)
    }
  }
}

const computeFactorySeed = (options: GenomeFactoryOptions): string => {
  const serialized = JSON.stringify(options)
  let hash = 0
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i)
    hash = (hash * 31 + char) >>> 0
  }
  return hash.toString(16)
}
