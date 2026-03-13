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
import type { QLAgent, QLAgentConfig } from '@neat-evolution/q-learning'
import { createQLAgent } from '@neat-evolution/q-learning'
import type { RNG } from '@neat-evolution/utils'
import { threadRNG } from '@neat-evolution/utils'
import type { QLearningTelemetry } from '@neat-evolution/worker-rl'

/**
 * Create a lightweight telemetry tracker for local QL evaluation.
 * Mirrors the worker-side tracker so local and worker runs produce
 * comparable diagnostics in the same `QLearningTelemetry` shape.
 */
function createLocalTelemetryTracker() {
  let episodes = 0
  let segments = 0
  let transitions = 0

  return {
    onSegmentTrained(segment: RolloutSegment): void {
      segments += 1
      transitions += segment.transitions.length
    },
    onEpisodeStart(_info: EpisodeInfo): void {
      episodes += 1
    },
    onEpisodeEnd(_result: EpisodeResult): void {
      // episode count is tracked in onEpisodeStart
    },
    toTelemetry(config: QLAgentConfig): QLearningTelemetry {
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

export interface QLPluginOptions {
  /** Learning rate for weight updates. */
  learningRate: number
  /** Discount factor (overrides environment's RLConfig if set). */
  discountFactor?: number

  /** Initial epsilon for epsilon-greedy action selection per genome evaluation. */
  epsilonInitial: number
  /** Multiplicative decay applied after each episode. Default: 1.0 (no decay) */
  epsilonDecayPerEpisode?: number
  /** Floor for epsilon decay. Default: 0.01 */
  epsilonMinimum?: number

  /** Multi-discrete Q-values: 2N outputs (Q_on, Q_off per factor). Default: false */
  multiDiscrete?: boolean

  /** Rollout length. Default: 32 or environment's suggestedRolloutLength. */
  rolloutLength?: number | 'episode'
  /** Minimum rollout length to prevent tiny segments. */
  minRolloutLength?: number
  /** Minimum |reward| to trigger capture. Default: 0.1 */
  rewardThreshold?: number

  /** Write learned weights back to genome. Default: true */
  isLamarckian?: boolean
}

/**
 * EvaluationPlugin that trains genomes via Q-learning (DQN-style) during evaluation.
 *
 * Worker path: The plugin provides training config via getWorkerPluginData().
 * The worker RL plugin enhances handleEvaluateGenome to create trainable
 * executors and QL agents internally. The evaluator handles writeback.
 * The plugin just delegates to defaultEvaluate().
 *
 * Local path: The plugin creates the QL agent and evaluates directly.
 * Lamarckian writeback is handled via afterFitness().
 *
 * Context hooks remain as a partial integration surface for environments
 * that evaluate plain executors (local path only).
 */
export class QLPlugin<G extends AnyGenome = AnyGenome>
  implements EvaluationPlugin<G>
{
  readonly mode = 'augmentation'
  private readonly algorithm: AnyAlgorithm
  private readonly options: QLPluginOptions
  private readonly rng: RNG
  private episodicEnvironment:
    | (EpisodicEnvironment & Partial<AgentEnvironment>)
    | undefined
  private rlConfig: RLConfig | undefined

  /** Current QL agent for getContextHooks() delegation. */
  private currentAgent: QLAgent | null = null

  /** Tracks updated actions per genome for local writeback in afterFitness. */
  private readonly pendingWritebacks = new Map<G, PhenotypeAction[]>()
  /** Latest telemetry keyed by genome (local evaluation only). */
  private readonly localTelemetryByGenome = new WeakMap<G, QLearningTelemetry>()

  constructor(
    algorithm: AnyAlgorithm,
    options: QLPluginOptions,
    rng: RNG = threadRNG()
  ) {
    this.algorithm = algorithm
    this.options = options
    this.rng = rng
  }

  initialize(context: PluginContext): void {
    if (!isEpisodicEnvironment(context.environment)) {
      throw new Error('QLPlugin requires an EpisodicEnvironment')
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
        method: 'q-learning' as const,
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
      throw new Error('QLPlugin not initialized — call initialize() first')
    }

    // Worker path: training is handled by the worker evaluation enhancer.
    // Just delegate to defaultEvaluate which routes through evaluateGenomeEntry.
    // The evaluator extracts writeback and telemetry from the enriched response.
    if (
      context.workerTrainingCapabilities?.rl?.methods?.['q-learning']
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

    const tracker = createLocalTelemetryTracker()
    const agent = createQLAgent(
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
  ): import('@neat-evolution/q-learning').QLAgentConfig {
    const rolloutConfig = this.buildRolloutConfig(rlConfig)
    const agentConfig: import('@neat-evolution/q-learning').QLAgentConfig = {
      learningRate: this.options.learningRate,
      actionCount: rlConfig.actionSize,
      discountFactor: this.options.discountFactor ?? rlConfig.discountFactor,
      rolloutConfig,
      epsilonInitial: this.options.epsilonInitial,
    }
    if (this.options.epsilonDecayPerEpisode !== undefined) {
      agentConfig.epsilonDecayPerEpisode = this.options.epsilonDecayPerEpisode
    }
    if (this.options.epsilonMinimum !== undefined) {
      agentConfig.epsilonMinimum = this.options.epsilonMinimum
    }
    if (this.options.multiDiscrete !== undefined) {
      agentConfig.multiDiscrete = this.options.multiDiscrete
    }
    return agentConfig
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
  getTelemetry(genome: G): QLearningTelemetry | undefined {
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
