/**
 * Episodic demo: runs vanilla NEAT, AC Lamarckian, AC Darwinian, and Q-Learning
 * side by side on a simple multi-armed bandit environment.
 *
 * Validates the full Phase 4 RL integration:
 *   genome creation → evaluation → RL training via rollout segments →
 *   writeback → reproduction
 *
 * Usage:
 *   yarn workspace @neat-evolution/demo episodic [--iterations N] [--seconds N] [--lr N]
 */

import { ACPlugin } from '@neat-evolution/actor-critic-plugin'
import type { EvaluationPlugin } from '@neat-evolution/evaluation-strategy'
import type { AnyAlgorithm } from '@neat-evolution/evaluator'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import { EvolutionManager } from '@neat-evolution/evolution-manager'
import { NEATAlgorithm, type NEATGenome } from '@neat-evolution/neat'
import { QLPlugin } from '@neat-evolution/q-learning-plugin'

import { BanditEnvironment } from './BanditEnvironment.js'

// --- Argument parsing ---

function parseArgs(argv: string[]) {
  const args = {
    learningRate: 0.01,
    iterations: 100,
    seconds: 0, // no time limit by default
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === '--lr' && next) {
      args.learningRate = Number(next)
      i++
    } else if (arg === '--iterations' && next) {
      args.iterations = Number(next)
      i++
    } else if (arg === '--seconds' && next) {
      args.seconds = Number(next)
      i++
    }
  }

  return args
}

const args = parseArgs(process.argv.slice(2))

console.log('=== Episodic Demo: Vanilla vs AC vs Q-Learning ===')
console.log(`Environment: Multi-arm bandit (3 episodes × 20 steps)`)
console.log(`Optimal average reward: 1.00`)
console.log(
  `Learning rate: ${args.learningRate}, Iterations: ${args.iterations}`
)
if (args.seconds > 0) {
  console.log(`Time limit: ${args.seconds}s per run`)
}
console.log()

// --- Variant runner ---

interface RunResult {
  name: string
  fitnessLog: number[]
  bestFitness: number
  bestGenome: NEATGenome | undefined
  elapsedMs: number
}

async function runVariant(
  name: string,
  outputCount: number,
  plugins?: EvaluationPlugin[]
): Promise<RunResult> {
  const fitnessLog: number[] = []
  const environment = new BanditEnvironment(outputCount)

  const manager = new EvolutionManager({
    algorithm: NEATAlgorithm,
    environment,
    ...(plugins != null ? { plugins } : {}),
    evolutionOptions: {
      ...defaultEvolutionOptions,
      iterations: args.iterations,
      secondsLimit: args.seconds,
      logInterval: Number.MAX_SAFE_INTEGER,
      afterEvaluate: (population) => {
        const best = population.best()
        fitnessLog.push(best?.fitness ?? 0)
      },
    },
    populationOptions: {
      ...defaultPopulationOptions,
    },
  })

  // Suppress evolve()'s built-in logging
  const originalLog = console.log
  console.log = () => {}

  const start = performance.now()
  try {
    const best = await manager.evolve()
    const elapsedMs = performance.now() - start

    return {
      name,
      fitnessLog,
      bestFitness: best?.fitness ?? 0,
      bestGenome: best?.genome as NEATGenome | undefined,
      elapsedMs,
    }
  } finally {
    console.log = originalLog
    await manager.terminate()
  }
}

// --- Run each variant ---

const lr = args.learningRate
const algorithm = NEATAlgorithm as AnyAlgorithm

// Vanilla NEAT — 3 outputs (one per arm)
console.log('Running: Vanilla NEAT...')
const vanilla = await runVariant('Vanilla', 3)
console.log(
  `  Done: ${vanilla.bestFitness.toFixed(4)} in ${(vanilla.elapsedMs / 1000).toFixed(1)}s`
)

// AC Lamarckian — 4 outputs (3 actor + 1 critic)
console.log('Running: AC Lamarckian...')
const acLamarckian = await runVariant('AC-Lamarck', 4, [
  new ACPlugin(
    algorithm,
    {
      learningRate: lr,
      isLamarckian: true,
      rolloutLength: 'episode',
      rewardThreshold: 0.1,
      entropyCoefficient: 0.01,
      actorActivation: 'softmax',
      discountFactor: 0,
    },
    Math.random
  ),
])
console.log(
  `  Done: ${acLamarckian.bestFitness.toFixed(4)} in ${(acLamarckian.elapsedMs / 1000).toFixed(1)}s`
)

// AC Darwinian — 4 outputs (3 actor + 1 critic)
console.log('Running: AC Darwinian...')
const acDarwinian = await runVariant('AC-Darwin', 4, [
  new ACPlugin(
    algorithm,
    {
      learningRate: lr,
      isLamarckian: false,
      rolloutLength: 'episode',
      rewardThreshold: 0.1,
      entropyCoefficient: 0.01,
      actorActivation: 'softmax',
      discountFactor: 0,
    },
    Math.random
  ),
])
console.log(
  `  Done: ${acDarwinian.bestFitness.toFixed(4)} in ${(acDarwinian.elapsedMs / 1000).toFixed(1)}s`
)

// Q-Learning — 3 outputs (3 Q-values)
console.log('Running: Q-Learning...')
const qLearning = await runVariant('Q-Learning', 3, [
  new QLPlugin(
    algorithm,
    {
      learningRate: lr,
      epsilon: 0.3,
      epsilonDecay: 0.95,
      epsilonMin: 0.01,
      isLamarckian: true,
      rolloutLength: 'episode',
      rewardThreshold: 0.1,
      discountFactor: 0,
    },
    Math.random
  ),
])
console.log(
  `  Done: ${qLearning.bestFitness.toFixed(4)} in ${(qLearning.elapsedMs / 1000).toFixed(1)}s`
)

// --- Fitness table ---

console.log()
console.log('=== Fitness by Generation ===')
console.log()

const results = [vanilla, acLamarckian, acDarwinian, qLearning]

const colWidth = 12
console.log(
  `${'Iteration'.padEnd(10)}${results.map((r) => r.name.padStart(colWidth)).join('')}`
)
console.log('-'.repeat(10 + results.length * colWidth))

const maxIters = Math.max(...results.map((r) => r.fitnessLog.length))

for (let i = 0; i < maxIters; i++) {
  if (i % 10 === 0 || i === maxIters - 1) {
    const cols = results
      .map((r) => {
        const val = r.fitnessLog[i]
        return val !== undefined
          ? val.toFixed(4).padStart(colWidth)
          : ''.padStart(colWidth)
      })
      .join('')
    console.log(`${String(i).padEnd(10)}${cols}`)
  }
}

console.log()
console.log(
  `${'Best'.padEnd(10)}${results.map((r) => r.bestFitness.toFixed(4).padStart(colWidth)).join('')}`
)
console.log(
  `${'Time'.padEnd(10)}${results.map((r) => `${(r.elapsedMs / 1000).toFixed(1)}s`.padStart(colWidth)).join('')}`
)
console.log(
  `${'ms/iter'.padEnd(10)}${results.map((r) => `${(r.elapsedMs / r.fitnessLog.length).toFixed(1)}`.padStart(colWidth)).join('')}`
)
