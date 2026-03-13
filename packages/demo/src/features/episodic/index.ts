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
 *     [--entropy 0.01] [--epsilon 0.3] [--epsilon-decay 0.95] [--epsilon-min 0.01] \
 *     [--telemetry]
 */

import { ACPlugin } from '@neat-evolution/actor-critic-plugin'
import type { AnyGenome } from '@neat-evolution/core'
import type { AnyAlgorithm } from '@neat-evolution/evaluator'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import {
  type EvaluationConfig,
  EvolutionManager,
  type WorkerConfig,
} from '@neat-evolution/evolution-manager'
import { NEATAlgorithm, type NEATGenome } from '@neat-evolution/neat'
import { QLPlugin } from '@neat-evolution/q-learning-plugin'
import { createRNG, setThreadRNGSeed, threadRNG } from '@neat-evolution/utils'
import type {
  ActorCriticTelemetry,
  QLearningTelemetry,
} from '@neat-evolution/worker-rl'

import { BanditEnvironment } from './BanditEnvironment.js'

interface VariantSummary {
  path: 'evaluate()' | 'evaluateAgent()'
  method: 'vanilla' | 'actor-critic' | 'q-learning'
  lamarckian?: boolean
  seedLabel?: string
  options: Record<string, string | number>
  notes?: string
}

type VariantTelemetry = ActorCriticTelemetry | QLearningTelemetry

interface VariantConfig {
  name: string
  description: string
  outputCount: number
  evaluation: EvaluationConfig
  summary: VariantSummary
  getTelemetry?: (genome: AnyGenome) => VariantTelemetry | undefined
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
    telemetry: false,
    workers: false,
    threadCount: undefined as number | undefined,
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
    } else if (arg === '--telemetry') {
      args.telemetry = true
    } else if (arg === '--workers') {
      args.workers = true
    } else if (arg === '--threads' && next) {
      args.threadCount = Number(next)
      args.workers = true
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

const acLamarckPlugin = new ACPlugin(
  algorithm,
  { ...baseAcOptions, isLamarckian: true },
  acLamarckRng.gen
)
const acDarwinPlugin = new ACPlugin(
  algorithm,
  { ...baseAcOptions, isLamarckian: false },
  acDarwinRng.gen
)
const qlPlugin = new QLPlugin(algorithm, qlOptions, qLearningRng)

const variants: VariantConfig[] = [
  {
    name: 'Vanilla',
    description: 'Baseline evolution via evaluate()',
    outputCount: 3,
    evaluation: { type: 'strategy' },
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
      plugins: [acLamarckPlugin],
    },
    getTelemetry: (g) => acLamarckPlugin.getTelemetry(g),
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
      plugins: [acDarwinPlugin],
    },
    getTelemetry: (g) => acDarwinPlugin.getTelemetry(g),
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
      plugins: [qlPlugin],
    },
    getTelemetry: (g) => qlPlugin.getTelemetry(g),
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

const workerConfig: WorkerConfig | undefined = args.workers
  ? {
      createEnvironmentPathname: '@neat-evolution/demo/bandit-environment',
      pluginPaths: ['@neat-evolution/worker-rl/workerPlugin'],
      ...(args.threadCount != null ? { threadCount: args.threadCount } : {}),
    }
  : undefined

console.log('=== Episodic Demo: Vanilla vs AC vs Q-Learning ===')
console.log(`Environment: Multi-arm bandit (3 episodes × 20 steps)`)
console.log(`Optimal average reward: 1.00`)
console.log(
  `Learning rate: ${args.learningRate}, Iterations: ${args.iterations}`
)
if (args.seconds > 0) {
  console.log(`Time limit: ${args.seconds}s per run`)
}
console.log(
  `Workers: ${args.workers ? `enabled${args.threadCount != null ? ` (${args.threadCount} threads)` : ''}` : 'disabled (main thread)'}`
)
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
  evaluation: EvaluationConfig,
  variantWorkerConfig?: WorkerConfig
): Promise<RunResult> {
  const fitnessLog: number[] = []
  const environment = new BanditEnvironment(outputCount)

  const manager = new EvolutionManager({
    algorithm: NEATAlgorithm,
    environment,
    evaluation,
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
    ...(variantWorkerConfig != null
      ? { workerConfig: variantWorkerConfig }
      : {}),
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
    variant.evaluation,
    workerConfig
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

// --- Telemetry ---

if (args.telemetry) {
  console.log()
  console.log('=== RL Telemetry (best genome, final generation) ===')

  for (const variant of variants) {
    const result = resultByName.get(variant.name)
    if (!result?.bestGenome || !variant.getTelemetry) continue

    const telemetry = variant.getTelemetry(
      result.bestGenome as unknown as AnyGenome
    )
    if (!telemetry) continue

    console.log()
    console.log(`--- ${variant.name} ---`)
    console.log(`  episodes:            ${telemetry.episodes}`)
    console.log(`  rolloutSegments:     ${telemetry.rolloutSegments}`)
    console.log(`  transitionsTrained:  ${telemetry.transitionsTrained}`)

    if ('actorActivation' in telemetry) {
      console.log(`  actorActivation:     ${telemetry.actorActivation}`)
      console.log(`  entropyCoefficient:  ${telemetry.entropyCoefficient}`)
      console.log(
        `  triggerCounts:       reward=${telemetry.triggerCounts.reward}, done=${telemetry.triggerCounts.done}, info=${telemetry.triggerCounts.info}`
      )
      if (telemetry.segmentReturn) {
        console.log(
          `  segmentReturn:       mean=${telemetry.segmentReturn.mean.toFixed(4)}, min=${telemetry.segmentReturn.min.toFixed(4)}, max=${telemetry.segmentReturn.max.toFixed(4)}`
        )
      }
      if (telemetry.episodeReturn) {
        console.log(
          `  episodeReturn:       mean=${telemetry.episodeReturn.mean.toFixed(4)}, min=${telemetry.episodeReturn.min.toFixed(4)}, max=${telemetry.episodeReturn.max.toFixed(4)}`
        )
      }
      if (telemetry.policyEntropy) {
        console.log(
          `  policyEntropy:       mean=${telemetry.policyEntropy.mean.toFixed(4)}, min=${telemetry.policyEntropy.min.toFixed(4)}, max=${telemetry.policyEntropy.max.toFixed(4)} (${telemetry.policyEntropy.samples} samples)`
        )
      }
    }

    if ('epsilonInitial' in telemetry) {
      console.log(`  epsilonInitial:      ${telemetry.epsilonInitial}`)
      console.log(`  epsilonFinal:        ${telemetry.epsilonFinal}`)
      console.log(`  epsilonDecay:        ${telemetry.epsilonDecayPerEpisode}`)
      console.log(`  epsilonMinimum:      ${telemetry.epsilonMinimum}`)
      console.log(`  multiDiscrete:       ${telemetry.multiDiscrete}`)
    }
  }
}
