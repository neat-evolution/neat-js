import type {
  StepAgent,
  StepEpisodeResult,
  StepOutcome,
} from '@neat-evolution/rl-core'
import { describe, expect, it } from 'vitest'
import { StepControlEnvironment } from '../src/features/step-control/StepControlEnvironment.js'

function makeForwardAgent(): {
  agent: StepAgent
  outcomes: StepOutcome[]
  results: StepEpisodeResult[]
} {
  const outcomes: StepOutcome[] = []
  const results: StepEpisodeResult[] = []
  return {
    outcomes,
    results,
    agent: {
      act(): Float64Array {
        return new Float64Array([0, 1])
      },
      completeStep(outcome: StepOutcome): void {
        outcomes.push(outcome)
      },
      startEpisode(): void {},
      endEpisode(result: StepEpisodeResult): void {
        results.push(result)
      },
    },
  }
}

describe('StepControlEnvironment', () => {
  it('rewards delayed control sequences that reach the goal', () => {
    const env = new StepControlEnvironment()
    const { agent, outcomes, results } = makeForwardAgent()

    const fitness = env.evaluateStepAgent(agent)

    expect(fitness).toBe(1)
    expect(outcomes.some((outcome) => outcome.reward === 1)).toBe(true)
    expect(results.every((result) => result.terminated)).toBe(true)
  })
})
