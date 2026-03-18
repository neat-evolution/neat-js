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

export interface StepControlFactoryOptions {
  outputCount?: number
}

export class StepControlEnvironment
  implements Environment<StepControlFactoryOptions>
{
  public readonly description: EnvironmentDescription
  public readonly isAsync = false
  private readonly initOptions:
    | EnvironmentInitOptions<StepAgentFactory, StepAgentFactoryOptions>
    | undefined

  private readonly actionCount = 2
  private readonly horizon = 6
  private readonly goalPosition = 3

  constructor(
    outputCount?: number,
    initOptions?: EnvironmentInitOptions
  ) {
    this.description = {
      inputs: this.goalPosition + 1,
      outputs: outputCount ?? 3,
    }
    this.initOptions = initOptions as
      | EnvironmentInitOptions<StepAgentFactory, StepAgentFactoryOptions>
      | undefined
  }

  toFactoryOptions(): StepControlFactoryOptions {
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
    let totalFitness = 0
    const episodes = 6

    for (let episodeIndex = 0; episodeIndex < episodes; episodeIndex++) {
      let position = 0
      let episodeReward = 0
      agent.startEpisode({
        episodeIndex,
        type: 'step-control',
        phase: 'chain',
        metadata: { horizon: this.horizon, goalPosition: this.goalPosition },
      })

      for (let step = 0; step < this.horizon; step++) {
        const observation = this.getObservation(position)
        const action = agent.act(observation)
        const moveForward = argmax(action, this.actionCount) === 1
        if (moveForward) {
          position = Math.min(this.goalPosition, position + 1)
        } else if (position > 0) {
          position -= 1
        }

        const reachedGoal = position === this.goalPosition
        const terminated = reachedGoal
        const truncated = !terminated && step === this.horizon - 1
        const reward = reachedGoal ? 1 : 0
        episodeReward += reward

        agent.completeStep({
          reward,
          nextState: this.getObservation(position),
          terminated,
          truncated,
          info: {
            step,
            position,
            reachedGoal,
          },
        })

        if (terminated || truncated) {
          agent.endEpisode({
            fitness: episodeReward,
            episodeReturn: episodeReward,
            totalSteps: step + 1,
            terminated,
            truncated,
            metadata: { reachedGoal },
          })
          break
        }
      }

      totalFitness += episodeReward
    }

    return totalFitness / episodes
  }

  private getObservation(position: number): Float64Array {
    const observation = new Float64Array(this.goalPosition + 1)
    observation[position] = 1
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
