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
  EpisodicContext,
  RolloutBufferConfig,
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
import type { QLAgent } from '@neat-evolution/q-learning'
import { createQLAgent } from '@neat-evolution/q-learning'
import type { RNG } from '@neat-evolution/utils'
import { threadRNG } from '@neat-evolution/utils'
import {
  type EvaluateRLAgentResult,
  type QLearningWorkerTelemetry,
  requestEvaluateRLAgent,
  WorkerRLDispatchError,
} from '@neat-evolution/worker-rl'

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
 * The primary RL path is direct agent evaluation: when the environment
 * implements AgentEnvironment, the plugin passes the QL agent directly so
 * the agent owns action selection, transition recording, and training.
 *
 * The context-hook path remains as a partial integration surface for
 * environments that still evaluate plain executors.
 *
 * `epsilonInitial` is applied at the start of each genome evaluation and the
 * optional `epsilonDecayPerEpisode` multiplier is applied after every episode
 * while clamping at `epsilonMinimum`.
 *
 * Lamarckian writeback is handled via afterFitness(): trained weights are written
 * back to the genome after fitness is assigned.
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

  /** Tracks updated actions per genome for writeback in afterFitness. */
  private readonly pendingWritebacks = new Map<G, PhenotypeAction[]>()
  /** Latest worker telemetry keyed by genome. */
  private readonly telemetryByGenome = new WeakMap<
    G,
    QLearningWorkerTelemetry
  >()

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

  async evaluateGenome(
    genome: G,
    defaultEvaluate: (genome: G) => Promise<number>,
    context: EvaluationContext<G>
  ): Promise<EvaluationResult> {
    if (this.episodicEnvironment === undefined || this.rlConfig === undefined) {
      throw new Error('QLPlugin not initialized — call initialize() first')
    }

    const rlConfig = this.rlConfig
    const isLamarckian = this.options.isLamarckian ?? true
    const wantsWorker = context.supportsTraining === true

    if (wantsWorker) {
      if (!isAgentEnvironment(this.episodicEnvironment)) {
        throw new WorkerRLDispatchError(
          'agent-environment-required',
          'q-learning',
          'Q-learning worker evaluation requires an AgentEnvironment implementation.'
        )
      }
      const rlCapabilities = context.workerTrainingCapabilities?.rl
      if (rlCapabilities == null) {
        throw new WorkerRLDispatchError(
          'capability-missing',
          'q-learning',
          'Worker RL capabilities were not reported during worker initialization.'
        )
      }
      if (rlCapabilities.supported !== true) {
        throw new WorkerRLDispatchError(
          'capability-missing',
          'q-learning',
          rlCapabilities.reason ??
            'Worker RL plugin is not registered on every worker thread.'
        )
      }
      const methodCapability = rlCapabilities.methods?.['q-learning']
      if (methodCapability == null || methodCapability.supported !== true) {
        throw new WorkerRLDispatchError(
          'method-unsupported',
          'q-learning',
          methodCapability?.reason ??
            'Worker RL plugin does not support q-learning evaluation.'
        )
      }
      if (
        isLamarckian &&
        methodCapability.supportsLamarckianWriteback === false
      ) {
        throw new WorkerRLDispatchError(
          'lamarckian-unsupported',
          'q-learning',
          'Worker RL plugin disabled Lamarckian writeback for q-learning evaluations.'
        )
      }
    }

    if (wantsWorker) {
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
    const agent = createQLAgent(trainable, agentConfig, this.rng)
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
      method: 'q-learning',
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
        'q-learning',
        'Worker RL q-learning evaluation failed.',
        { cause: error instanceof Error ? error : undefined }
      )
    }
    if (result.method !== 'q-learning') {
      throw new WorkerRLDispatchError(
        'result-mismatch',
        'q-learning',
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
    hash = (hash * 31 + serialized.charCodeAt(i)) >>> 0
  }
  return hash.toString(16)
}
