import type { StaticExecutor } from '@neat-evolution/executor'
import type { StepAgent } from './StepAgent.js'

export const createVanillaStepAgent = (executor: StaticExecutor): StepAgent => ({
  act(observation: Float64Array): Float64Array {
    const output = executor.forward(observation)
    return output instanceof Float64Array ? output : Float64Array.from(output)
  },
  completeStep(): void {},
  startEpisode(): void {},
  endEpisode(): void {},
})
