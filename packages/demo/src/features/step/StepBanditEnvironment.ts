import type {
  Environment,
  EnvironmentDescription,
} from '@neat-evolution/environment'
import type {
  EnvironmentInitOptions,
  PartialEvaluationContext,
} from '@neat-evolution/execution-manager'
import type { StaticExecutor } from '@neat-evolution/executor'
import {
  createVanillaStepAgent,
  type StepAgent,
  type StepAgentFactory,
  type StepAgentFactoryOptions,
} from '@neat-evolution/rl-core'

interface BanditEpisode {
  index: number
  bestArm: number
}

export interface StepBanditFactoryOptions {
  outputCount?: number
}

export class StepBanditEnvironment
  implements Environment<StepBanditFactoryOptions>
{
  public readonly description: EnvironmentDescription
  public readonly isAsync = false
  private readonly initOptions:
    | EnvironmentInitOptions<StepAgentFactory, StepAgentFactoryOptions>
    | undefined

  private readonly episodes: BanditEpisode[] = [
    { index: 0, bestArm: 0 },
    { index: 1, bestArm: 1 },
    { index: 2, bestArm: 2 },
  ]

  private readonly stepsPerEpisode = 20
  private readonly armCount = 3

  constructor(outputCount?: number, initOptions?: EnvironmentInitOptions) {
    this.description = {
      inputs: 3,
      outputs: outputCount ?? 4,
    }
    this.initOptions = initOptions as
      | EnvironmentInitOptions<StepAgentFactory, StepAgentFactoryOptions>
      | undefined
  }

  toFactoryOptions(): StepBanditFactoryOptions {
    return { outputCount: this.description.outputs }
  }

  evaluate(
    executor: StaticExecutor,
    context?: PartialEvaluationContext
  ): number {
    const factory =
      this.initOptions?.createExecutionManager ?? createVanillaStepAgent
    const options = (this.initOptions?.executionManagerFactoryOptions ??
      {}) as StepAgentFactoryOptions
    const agent = factory(executor, options, context)
    return this.evaluateStepAgent(agent)
  }

  async evaluateAsync(
    executor: StaticExecutor,
    context?: PartialEvaluationContext
  ): Promise<number> {
    return this.evaluate(executor, context)
  }

  evaluateStepAgent(agent: StepAgent): number {
    let totalReward = 0

    for (const episode of this.episodes) {
      agent.startEpisode({
        episodeIndex: episode.index,
        type: 'step-bandit',
        phase: `arm-${episode.bestArm}`,
        metadata: { bestArm: episode.bestArm },
      })

      let episodeReward = 0
      let observation = this.getObservation(episode.index)

      for (let step = 0; step < this.stepsPerEpisode; step++) {
        const action = agent.act(observation)
        const chosenArm = argmax(action, this.armCount)
        const reward = chosenArm === episode.bestArm ? 1 : 0
        const done = step === this.stepsPerEpisode - 1
        const nextState = this.getObservation(episode.index)

        agent.completeStep({
          reward,
          nextState,
          terminated: false,
          truncated: done,
          info: {
            bestArm: episode.bestArm,
            step,
          },
        })

        totalReward += reward
        episodeReward += reward
        observation = nextState
      }

      agent.endEpisode({
        fitness: episodeReward / this.stepsPerEpisode,
        episodeReturn: episodeReward,
        totalSteps: this.stepsPerEpisode,
        terminated: false,
        truncated: true,
        metadata: { bestArm: episode.bestArm },
      })
    }

    return totalReward / (this.episodes.length * this.stepsPerEpisode)
  }

  private getObservation(episodeIndex: number): Float64Array {
    const observation = new Float64Array(3)
    observation[episodeIndex] = 1
    return observation
  }
}

function argmax(values: Float64Array, count: number): number {
  let bestIndex = 0
  let bestValue = values[0] as number
  for (let i = 1; i < count; i++) {
    const value = values[i] as number
    if (value > bestValue) {
      bestValue = value
      bestIndex = i
    }
  }
  return bestIndex
}
