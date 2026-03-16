import type { Environment } from '@neat-evolution/environment'
import type { EnvironmentInitOptions } from '@neat-evolution/execution-manager'
import type { StaticExecutor } from '@neat-evolution/executor'

/**
 * Minimal XOR environment for testing.
 * 2 inputs, 1 output. Fitness = 1 - average absolute error.
 */
const testCases = [
  { input: [0, 0], expected: 0 },
  { input: [0, 1], expected: 1 },
  { input: [1, 0], expected: 1 },
  { input: [1, 1], expected: 0 },
]

function evaluate(executor: StaticExecutor): number {
  let totalError = 0
  for (const { input, expected } of testCases) {
    const output = executor.forward(input)
    totalError += Math.abs((output[0] ?? 0) - expected)
  }
  return 1 - totalError / testCases.length
}

export function createEnvironment(
  _factoryOptions: null,
  _initOptions?: EnvironmentInitOptions
): Environment<null> {
  return {
    description: { inputs: 2, outputs: 1 },
    isAsync: false,
    toFactoryOptions: () => null,
    evaluate,
    evaluateAsync: async (executor) => evaluate(executor),
  }
}
