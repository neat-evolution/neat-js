import type { StaticExecutor } from '@neat-evolution/executor'
import type {
  StepAgent,
  StepEpisodeResult,
  StepOutcome,
} from '@neat-evolution/rl-core'
import { describe, expect, it } from 'vitest'
import { StepBanditEnvironment } from '../src/features/step/StepBanditEnvironment.js'

function makeMockStepAgent(chosenArm: number): {
  agent: StepAgent
  calls: {
    startEpisode: number
    endEpisode: number
    act: number
    completeStep: StepOutcome[]
    episodeResults: StepEpisodeResult[]
  }
} {
  const action = new Float64Array(3)
  action[chosenArm] = 1
  const calls = {
    startEpisode: 0,
    endEpisode: 0,
    act: 0,
    completeStep: [] as StepOutcome[],
    episodeResults: [] as StepEpisodeResult[],
  }

  return {
    calls,
    agent: {
      act(): Float64Array {
        calls.act++
        return action
      },
      completeStep(outcome: StepOutcome): void {
        calls.completeStep.push(outcome)
      },
      startEpisode(): void {
        calls.startEpisode++
      },
      endEpisode(result: StepEpisodeResult): void {
        calls.endEpisode++
        calls.episodeResults.push(result)
      },
    },
  }
}

describe('StepBanditEnvironment', () => {
  it('runs the step-agent lifecycle across all episodes', () => {
    const env = new StepBanditEnvironment()
    const { agent, calls } = makeMockStepAgent(0)

    const fitness = env.evaluateStepAgent(agent)

    expect(fitness).toBeCloseTo(1 / 3, 5)
    expect(calls.startEpisode).toBe(3)
    expect(calls.endEpisode).toBe(3)
    expect(calls.act).toBe(60)
    expect(calls.completeStep).toHaveLength(60)

    const truncatedIndices = calls.completeStep
      .map((outcome, index) => (outcome.truncated ? index : -1))
      .filter((index) => index >= 0)
    expect(truncatedIndices).toEqual([19, 39, 59])
  })

  it('hydrates createExecutionManager through init options during evaluate()', () => {
    const env = new StepBanditEnvironment(4, {
      createExecutionManager: (
        _executor: StaticExecutor,
        options: Record<string, unknown>
      ) => {
        expect(options).toEqual({ seed: 'step' })
        return makeMockStepAgent(0).agent
      },
      executionManagerFactoryOptions: {
        seed: 'step',
      },
    })

    const fitness = env.evaluate({
      forward: () => new Float64Array([1, 0, 0, 0]),
      forwardBatch: () => [],
    })

    expect(fitness).toBeCloseTo(1 / 3, 5)
  })
})
