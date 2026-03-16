import type {
  AgentEnvironment,
  AgentFactoryOptions,
  Environment,
  EnvironmentDescription,
  EnvironmentRuntimeOptions,
  EpisodicEnvironment,
  RLConfig,
  RuntimeConfigurable,
} from '@neat-evolution/environment'
import {
  createVanillaAgent,
  type EpisodicAgent,
} from '@neat-evolution/environment'
import type { StaticExecutor } from '@neat-evolution/executor'

/** Configuration for a single bandit episode. */
interface BanditEpisode {
  /** Index of this episode (0-based). */
  index: number
  /** Index of the arm with the highest payoff. */
  bestArm: number
}

/**
 * Simple multi-armed bandit environment with episodic structure.
 *
 * 3 episodes, each with a different best arm:
 *   Episode 0: arm 0 is best
 *   Episode 1: arm 1 is best
 *   Episode 2: arm 2 is best
 *
 * Each episode runs for 20 steps. The agent chooses an arm each step
 * (argmax of outputs). Reward = 1 for best arm, 0 otherwise.
 *
 * Observation: one-hot encoding of the current episode index.
 *   Episode 0: [1, 0, 0]
 *   Episode 1: [0, 1, 0]
 *   Episode 2: [0, 0, 1]
 *
 * Fitness = average reward across all episodes and steps (range [0, 1]).
 * Optimal fitness = 1.0 (always pulls the best arm).
 */
export interface BanditFactoryOptions {
  outputCount?: number
}

export class BanditEnvironment
  implements
    Environment<BanditFactoryOptions>,
    EpisodicEnvironment,
    AgentEnvironment,
    RuntimeConfigurable
{
  public readonly description: EnvironmentDescription
  public readonly isAsync = false
  private runtimeOptions: EnvironmentRuntimeOptions | undefined

  private readonly episodes: BanditEpisode[] = [
    { index: 0, bestArm: 0 },
    { index: 1, bestArm: 1 },
    { index: 2, bestArm: 2 },
  ]

  private readonly stepsPerEpisode = 20
  private readonly armCount = 3

  constructor(outputCount?: number) {
    this.description = {
      inputs: 3,
      outputs: outputCount ?? 3,
    }
  }

  toFactoryOptions(): BanditFactoryOptions {
    return { outputCount: this.description.outputs }
  }

  setRuntimeOptions(options: EnvironmentRuntimeOptions): void {
    this.runtimeOptions = options
  }

  getRLConfig(): RLConfig {
    return {
      actionSize: this.armCount,
      discountFactor: 0,
      maxStepsPerEpisode: this.stepsPerEpisode,
      suggestedRolloutLength: 'episode',
    }
  }

  evaluate(executor: StaticExecutor): number {
    const factory = this.runtimeOptions?.createAgent ?? createVanillaAgent
    const options = (this.runtimeOptions?.agentFactoryOptions ??
      {}) as AgentFactoryOptions
    const agent = factory(
      executor,
      options,
      this.runtimeOptions?.evaluationContext
    )
    return this.evaluateAgent(agent)
  }

  async evaluateAsync(executor: StaticExecutor): Promise<number> {
    return this.evaluate(executor)
  }

  /**
   * Run the full game loop with an EpisodicAgent.
   *
   * RL plugins call this directly with their trained agent (ACAgent or QLAgent),
   * so agent.act() routes through the RL agent's forward pass + transition recording.
   * Vanilla evaluation wraps a StaticExecutor in a vanilla agent.
   */
  evaluateAgent(agent: EpisodicAgent): number {
    let totalReward = 0

    for (const episode of this.episodes) {
      agent.startEpisode({
        episodeIndex: episode.index,
        type: 'bandit',
        phase: `arm-${episode.bestArm}`,
        metadata: { bestArm: episode.bestArm },
      })
      let episodeReward = 0

      for (let step = 0; step < this.stepsPerEpisode; step++) {
        const observation = this.getObservation(episode.index)
        const output = agent.act(observation)
        const chosenArm = argmax(output, this.armCount)
        const reward = chosenArm === episode.bestArm ? 1 : 0
        const done = step === this.stepsPerEpisode - 1

        agent.reward(reward, done)
        totalReward += reward
        episodeReward += reward
      }

      agent.endEpisode({
        fitness: episodeReward / this.stepsPerEpisode,
        episodeReturn: episodeReward,
        totalSteps: this.stepsPerEpisode,
        terminated: false,
        metadata: { bestArm: episode.bestArm },
      })
    }

    return totalReward / (this.episodes.length * this.stepsPerEpisode)
  }

  /**
   * Episode-conditioned observation encoding.
   * Each episode index maps to a dedicated one-hot feature so the
   * policy can specialize per episode within a single evaluation lifetime.
   */
  private getObservation(episodeIndex: number): Float64Array {
    const obs = new Float64Array(3)
    obs[episodeIndex] = 1
    return obs
  }
}

/** Return the index of the maximum value in the first `count` elements. */
function argmax(values: Float64Array, count: number): number {
  let bestIndex = 0
  let bestValue = values[0] as number
  for (let i = 1; i < count; i++) {
    const v = values[i] as number
    if (v > bestValue) {
      bestValue = v
      bestIndex = i
    }
  }
  return bestIndex
}
