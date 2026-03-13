import type { ACAgent } from '@neat-evolution/actor-critic'
import { createACAgent } from '@neat-evolution/actor-critic'
import { createTrainableExecutor } from '@neat-evolution/backprop'
import type {
  AnyAlgorithm,
  AnyGenome,
  PhenotypeAction,
} from '@neat-evolution/core'
import type {
  EpisodicContext,
  RolloutBufferConfig,
} from '@neat-evolution/environment'
import {
  type EpisodicEnvironment,
  isAgentEvaluatable,
  isEpisodicEnvironment,
  type RLConfig,
} from '@neat-evolution/environment'
import type {
  EvaluationContext,
  EvaluationPlugin,
  EvaluationResult,
  PluginContext,
} from '@neat-evolution/evaluation-strategy'

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
 * When the environment implements AgentEvaluatable, the plugin passes the
 * AC agent directly for local evaluation — the agent's act() handles forward
 * passes, transition recording, and training. Otherwise falls back to
 * defaultEvaluate() (augmentation pattern, no training without act threading).
 *
 * Lamarckian writeback is handled via afterFitness(): trained weights are written
 * back to the genome after fitness is assigned.
 */
export class ACPlugin<G extends AnyGenome = AnyGenome>
  implements EvaluationPlugin<G>
{
  private readonly algorithm: AnyAlgorithm
  private readonly options: ACPluginOptions
  private readonly rng: () => number
  private episodicEnvironment: EpisodicEnvironment | undefined
  private rlConfig: RLConfig | undefined

  /** Current AC agent for getContextHooks() delegation. */
  private currentAgent: ACAgent | null = null

  /** Tracks updated actions per genome for writeback in afterFitness. */
  private readonly pendingWritebacks = new Map<G, PhenotypeAction[]>()

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
    _context: EvaluationContext<G>
  ): Promise<EvaluationResult> {
    if (this.episodicEnvironment === undefined || this.rlConfig === undefined) {
      throw new Error('ACPlugin not initialized — call initialize() first')
    }

    const rlConfig = this.rlConfig
    const isLamarckian = this.options.isLamarckian ?? true

    // 1. Create trainable executor from genome
    const phenotype = this.algorithm.createPhenotype(genome)
    const trainable = createTrainableExecutor(phenotype)

    // 2. Create AC agent with RolloutBuffer
    const rolloutLength =
      this.options.rolloutLength ?? rlConfig.suggestedRolloutLength ?? 32

    const rolloutConfig: RolloutBufferConfig = {
      rolloutLength,
      rewardThreshold: this.options.rewardThreshold ?? 0.1,
    }
    if (this.options.minRolloutLength !== undefined) {
      rolloutConfig.minRolloutLength = this.options.minRolloutLength
    }

    const agent = createACAgent(
      trainable,
      {
        learningRate: this.options.learningRate,
        actionCount: rlConfig.actionSize,
        gradientConfig: {
          discountFactor:
            this.options.discountFactor ?? rlConfig.discountFactor,
          entropyCoefficient: this.options.entropyCoefficient ?? 0.01,
          clipGradients: this.options.clipGradients ?? false,
          gradientClipValue: this.options.gradientClipValue ?? 1.0,
        },
        rolloutConfig,
        actorActivation: this.options.actorActivation ?? 'softmax',
      },
      this.rng
    )
    this.currentAgent = agent

    // 3. Evaluate — prefer local evaluation with agent if supported
    let fitness: number
    if (isAgentEvaluatable(this.episodicEnvironment)) {
      // Local evaluation: agent's act() handles forward pass + transition recording
      fitness = this.episodicEnvironment.evaluateAgent(agent)
    } else {
      // Fallback: augmentation pattern via defaultEvaluate
      // Note: without act hook threading, no transitions are recorded
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
      reward: (_executor, reward, done) => {
        this.currentAgent?.reward(reward, done)
      },
      episodeStart: (_executor, info) => {
        this.currentAgent?.startEpisode(info)
      },
      episodeEnd: (_executor, result) => {
        this.currentAgent?.endEpisode(result)
      },
      annotateFrame: (_executor, annotation) => {
        this.currentAgent?.annotate(annotation)
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
