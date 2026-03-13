/**
 * Episodic demo: runs vanilla NEAT, AC Lamarckian, AC Darwinian, and Q-Learning
 * side by side on a simple multi-armed bandit environment.
 *
 * Validates the full Phase 4 RL integration:
 *   genome creation → evaluation → RL training via rollout segments →
 *   writeback → reproduction.
 *
 * Usage:
 *   yarn workspace @neat-evolution/demo episodic \
 *     [--iterations N] [--seconds N] [--lr N] \
 *     [--seed phase4-demo|--no-seed] [--ac-seed custom] [--ql-seed custom] \
 *     [--entropy 0.01] [--epsilon 0.3] [--epsilon-decay 0.95] [--epsilon-min 0.01]
 */

import { ACPlugin } from '@neat-evolution/actor-critic-plugin'
import type { AnyAlgorithm } from '@neat-evolution/evaluator'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import {
  type EvaluationConfig,
  EvolutionManager,
} from '@neat-evolution/evolution-manager'
import { NEATAlgorithm, type NEATGenome } from '@neat-evolution/neat'
import { QLPlugin } from '@neat-evolution/q-learning-plugin'
import { createRNG, setThreadRNGSeed, threadRNG } from '@neat-evolution/utils'

import { BanditEnvironment } from './BanditEnvironment.js'

interface VariantSummary {
  path: 'evaluate()' | 'evaluateAgent()'
  method: 'vanilla' | 'actor-critic' | 'q-learning'
  lamarckian?: boolean
  seedLabel?: string
  options: Record<string, string | number>
  notes?: string
}

interface VariantConfig {
  name: string
  description: string
  outputCount: number
  evaluation?: EvaluationConfig
  summary: VariantSummary
}

// --- Argument parsing ---

function parseArgs(argv: string[]) {
  const args = {
    learningRate: 0.01,
    iterations: 100,
    seconds: 0, // no time limit by default
    seed: 'phase4-demo' as string | undefined,
    acSeed: undefined as string | undefined,
    qlSeed: undefined as string | undefined,
    entropyCoefficient: 0.01,
    epsilonInitial: 0.3,
    epsilonDecayPerEpisode: 0.95,
    epsilonMinimum: 0.01,
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
    } else if (arg === '--seed' && next) {
      args.seed = next
      i++
    } else if (arg === '--no-seed') {
      args.seed = undefined
    } else if (arg === '--ac-seed' && next) {
      args.acSeed = next
      i++
    } else if (arg === '--ql-seed' && next) {
      args.qlSeed = next
      i++
    } else if (arg === '--entropy' && next) {
      args.entropyCoefficient = Number(next)
      i++
    } else if (arg === '--epsilon' && next) {
      args.epsilonInitial = Number(next)
      i++
    } else if (arg === '--epsilon-decay' && next) {
      args.epsilonDecayPerEpisode = Number(next)
      i++
    } else if (arg === '--epsilon-min' && next) {
      args.epsilonMinimum = Number(next)
      i++
    }
  }

  return args
}

const args = parseArgs(process.argv.slice(2))

if (args.seed) {
  setThreadRNGSeed(args.seed)
}

const algorithm = NEATAlgorithm as AnyAlgorithm

const acSeedBase = args.acSeed ?? args.seed
const qlSeedBase = args.qlSeed ?? args.seed

const acLamarckSeed = acSeedBase ? `${acSeedBase}:ac-lamarck` : undefined
const acDarwinSeed = acSeedBase ? `${acSeedBase}:ac-darwin` : undefined
const qlSeed = qlSeedBase ? `${qlSeedBase}:q-learning` : undefined

const acLamarckRng = acLamarckSeed ? createRNG(acLamarckSeed) : createRNG()
const acDarwinRng = acDarwinSeed ? createRNG(acDarwinSeed) : createRNG()
const qLearningRng = qlSeed ? createRNG(qlSeed) : threadRNG()

const baseAcOptions = {
  learningRate: args.learningRate,
  rolloutLength: 'episode' as const,
  rewardThreshold: 0.1,
  entropyCoefficient: args.entropyCoefficient,
  actorActivation: 'softmax' as const,
  discountFactor: 0,
}

const qlOptions = {
  learningRate: args.learningRate,
  epsilonInitial: args.epsilonInitial,
  epsilonDecayPerEpisode: args.epsilonDecayPerEpisode,
  epsilonMinimum: args.epsilonMinimum,
  isLamarckian: true,
  rolloutLength: 'episode' as const,
  rewardThreshold: 0.1,
  discountFactor: 0,
}

const variants: VariantConfig[] = [
  {
    name: 'Vanilla',
    description: 'Baseline evolution via evaluate()',
    outputCount: 3,
    summary: {
      path: 'evaluate()',
      method: 'vanilla',
      options: {
        outputs: 3,
        agent: 'SyncExecutor',
      },
      seedLabel: args.seed ?? 'threadRNG()',
      notes: 'No RL updates, serves as the control run',
    },
  },
  {
    name: 'AC-Lamarck',
    description: 'Actor-Critic with Lamarckian writeback',
    outputCount: 4,
    evaluation: {
      type: 'plugin-augmentation',
      plugins: [
        new ACPlugin(
          algorithm,
          {
            ...baseAcOptions,
            isLamarckian: true,
          },
          acLamarckRng.gen
        ),
      ],
    },
    summary: {
      path: 'evaluateAgent()',
      method: 'actor-critic',
      lamarckian: true,
      options: {
        rolloutLength: 'episode',
        entropy: args.entropyCoefficient,
      },
      seedLabel: acLamarckSeed ?? 'threadRNG()',
      notes:
        'Augments evaluation with evaluateAgent() and writes trained weights back',
    },
  },
  {
    name: 'AC-Darwin',
    description: 'Actor-Critic without Lamarckian writeback',
    outputCount: 4,
    evaluation: {
      type: 'plugin-augmentation',
      plugins: [
        new ACPlugin(
          algorithm,
          {
            ...baseAcOptions,
            isLamarckian: false,
          },
          acDarwinRng.gen
        ),
      ],
    },
    summary: {
      path: 'evaluateAgent()',
      method: 'actor-critic',
      lamarckian: false,
      options: {
        rolloutLength: 'episode',
        entropy: args.entropyCoefficient,
      },
      seedLabel: acDarwinSeed ?? 'threadRNG()',
      notes:
        'Same AC config as Lamarckian run, but discards learned weights after evaluation',
    },
  },
  {
    name: 'Q-Learning',
    description: 'DQN-style epsilon-greedy training with Lamarckian writeback',
    outputCount: 3,
    evaluation: {
      type: 'plugin-augmentation',
      plugins: [new QLPlugin(algorithm, qlOptions, qLearningRng)],
    },
    summary: {
      path: 'evaluateAgent()',
      method: 'q-learning',
      lamarckian: true,
      options: {
        epsilonInitial: args.epsilonInitial,
        epsilonDecay: args.epsilonDecayPerEpisode,
        epsilonMinimum: args.epsilonMinimum,
      },
      seedLabel: qlSeed ?? 'threadRNG()',
      notes:
        'Uses evaluateAgent() with epsilon scheduling and rollout segments in episode mode',
    },
  },
]

console.log('=== Episodic Demo: Vanilla vs AC vs Q-Learning ===')
console.log(`Environment: Multi-arm bandit (3 episodes × 20 steps)`)
console.log(`Optimal average reward: 1.00`)
console.log(
  `Learning rate: ${args.learningRate}, Iterations: ${args.iterations}`
)
if (args.seconds > 0) {
  console.log(`Time limit: ${args.seconds}s per run`)
}
console.log(`Base RNG seed: ${args.seed ?? 'not set (thread RNG)'}`)
console.log('\nVariant configuration:')
for (const variant of variants) {
  const optionsText = Object.entries(variant.summary.options)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')
  console.log(
    `- ${variant.name}: ${variant.description}. Path=${variant.summary.path}, Method=${variant.summary.method}, Lamarckian=${variant.summary.lamarckian ?? 'n/a'}, Seed=${variant.summary.seedLabel ?? 'n/a'}. Options: ${optionsText}. ${variant.summary.notes ?? ''}`.trim()
  )
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
  evaluation?: EvaluationConfig
): Promise<RunResult> {
  const fitnessLog: number[] = []
  const environment = new BanditEnvironment(outputCount)

  const manager = new EvolutionManager({
    algorithm: NEATAlgorithm,
    environment,
    ...(evaluation != null ? { evaluation } : {}),
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

const results: RunResult[] = []
for (const variant of variants) {
  console.log(`Running: ${variant.name}...`)
  const result = await runVariant(
    variant.name,
    variant.outputCount,
    variant.evaluation
  )
  console.log(
    `  Done: ${result.bestFitness.toFixed(4)} in ${(result.elapsedMs / 1000).toFixed(1)}s`
  )
  results.push(result)
}

// --- Fitness table ---

console.log()
console.log('=== Fitness by Generation ===')
console.log()

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

const resultByName = new Map(results.map((r) => [r.name, r]))

const vanilla = resultByName.get('Vanilla')
const acLamarckian = resultByName.get('AC-Lamarck')
const acDarwinian = resultByName.get('AC-Darwin')
const qLearning = resultByName.get('Q-Learning')

function summarizeComparison(
  label: string,
  baseline: RunResult | undefined,
  challenger: RunResult | undefined,
  held: string,
  changed: string
) {
  if (!baseline || !challenger) return
  const delta = challenger.bestFitness - baseline.bestFitness
  console.log()
  console.log(`Comparison: ${label}`)
  console.log(`  Held constant: ${held}`)
  console.log(`  Changed: ${changed}`)
  console.log(
    `  Result: ${challenger.name} best=${challenger.bestFitness.toFixed(4)} vs ${baseline.name} best=${baseline.bestFitness.toFixed(4)} (Δ=${delta.toFixed(4)})`
  )
}

const heldConstants = `Bandit env (3×20), iterations=${args.iterations}, learningRate=${args.learningRate}, rolloutLength='episode'`

summarizeComparison(
  'Vanilla evolution vs AC Lamarckian',
  vanilla,
  acLamarckian,
  `${heldConstants}, same genomes + evaluator, base seed=${args.seed ?? 'thread RNG'}`,
  'AC plugin owns evaluateAgent(), trains actor-critic minisodes, Lamarckian weight writeback'
)

summarizeComparison(
  'Vanilla evolution vs Q-Learning',
  vanilla,
  qLearning,
  `${heldConstants}, same genomes + evaluator, base seed=${args.seed ?? 'thread RNG'}`,
  'QL plugin owns evaluateAgent(), epsilon schedule + rollout segments, Lamarckian weight writeback'
)

summarizeComparison(
  'AC Lamarckian vs AC Darwinian',
  acDarwinian,
  acLamarckian,
  `${heldConstants}, identical actor-critic config + seeds`,
  'Only Lamarckian writeback differs (Darwinian discards learned weights)'
)
