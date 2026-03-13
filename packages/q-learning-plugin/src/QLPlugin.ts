import { createTrainableExecutor } from '@neat-evolution/backprop'
import type {
  AnyAlgorithm,
  AnyGenome,
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

export interface QLPluginOptions {
  /** Learning rate for weight updates. */
  learningRate: number
  /** Discount factor (overrides environment's RLConfig if set). */
  discountFactor?: number

  /** Initial epsilon for epsilon-greedy action selection. */
  epsilon: number
  /** Per-episode multiplicative decay applied to epsilon. Default: 1.0 (no decay) */
  epsilonDecay?: number
  /** Floor for epsilon decay. Default: 0.01 */
  epsilonMin?: number

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
 * Epsilon resets to the configured value at the start of each genome evaluation
 * and decays across episodes within that evaluation (within-evaluation decay).
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
  private readonly rng: () => number
  private episodicEnvironment:
    | (EpisodicEnvironment & Partial<AgentEnvironment>)
    | undefined
  private rlConfig: RLConfig | undefined

  /** Current QL agent for getContextHooks() delegation. */
  private currentAgent: QLAgent | null = null

  /** Tracks updated actions per genome for writeback in afterFitness. */
  private readonly pendingWritebacks = new Map<G, PhenotypeAction[]>()

  constructor(
    algorithm: AnyAlgorithm,
    options: QLPluginOptions,
    rng: () => number
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
    _context: EvaluationContext<G>
  ): Promise<EvaluationResult> {
    if (this.episodicEnvironment === undefined || this.rlConfig === undefined) {
      throw new Error('QLPlugin not initialized — call initialize() first')
    }

    const rlConfig = this.rlConfig
    const isLamarckian = this.options.isLamarckian ?? true

    // 1. Create trainable executor from genome
    const phenotype = this.algorithm.createPhenotype(genome)
    const trainable = createTrainableExecutor(phenotype)

    // 2. Create QL agent with RolloutBuffer
    const rolloutLength =
      this.options.rolloutLength ?? rlConfig.suggestedRolloutLength ?? 32

    const rolloutConfig: RolloutBufferConfig = {
      rolloutLength,
      rewardThreshold: this.options.rewardThreshold ?? 0.1,
    }
    if (this.options.minRolloutLength !== undefined) {
      rolloutConfig.minRolloutLength = this.options.minRolloutLength
    }

    const agentConfig: import('@neat-evolution/q-learning').QLAgentConfig = {
      learningRate: this.options.learningRate,
      actionCount: rlConfig.actionSize,
      discountFactor: this.options.discountFactor ?? rlConfig.discountFactor,
      rolloutConfig,
      epsilon: this.options.epsilon,
    }
    if (this.options.epsilonDecay !== undefined) {
      agentConfig.epsilonDecay = this.options.epsilonDecay
    }
    if (this.options.epsilonMin !== undefined) {
      agentConfig.epsilonMin = this.options.epsilonMin
    }
    if (this.options.multiDiscrete !== undefined) {
      agentConfig.multiDiscrete = this.options.multiDiscrete
    }
    const agent = createQLAgent(trainable, agentConfig, this.rng)
    this.currentAgent = agent

    // 3. Evaluate — prefer local evaluation with agent if supported
    let fitness: number
    if (isAgentEnvironment(this.episodicEnvironment)) {
      fitness = this.episodicEnvironment.evaluateAgent(agent)
    } else {
      fitness = await defaultEvaluate(genome)
    }

    // 4. Store updated weights for potential writeback
    if (isLamarckian) {
      this.pendingWritebacks.set(genome, trainable.getUpdatedActions())
    }

    // 5. Clean up per-evaluation state
    this.currentAgent = null

    return { fitness }
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
