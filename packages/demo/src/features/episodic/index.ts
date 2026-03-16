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
 *     [--iterations N] [--seconds N] [--lr N] [--threads N] \
 *     [--seed phase4-demo|--no-seed] [--ac-seed custom] [--ql-seed custom] \
 *     [--entropy 0.01] [--epsilon 0.3] [--epsilon-decay 0.95] [--epsilon-min 0.01]
 */

import type { ACAgentConfig } from '@neat-evolution/actor-critic'
import { Activation } from '@neat-evolution/core'
import type { RolloutBufferConfig } from '@neat-evolution/environment'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import {
  EvolutionManager,
  type EvaluatorConfig,
} from '@neat-evolution/evolution-manager'
import {
  defaultNEATGenomeOptions,
  NEATAlgorithm,
  type NEATGenome,
  type NEATGenomeOptions,
} from '@neat-evolution/neat'
import type { QLAgentConfig } from '@neat-evolution/q-learning'
import { createRNG, setThreadRNGSeed } from '@neat-evolution/utils'

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
  evaluatorConfig: Partial<EvaluatorConfig>
  genomeOptions?: Partial<NEATGenomeOptions>
  summary: VariantSummary
}

// --- Argument parsing ---

function parseArgs(argv: string[]) {
  const args = {
    learningRate: 0.1,
    iterations: 100,
    seconds: 0, // no time limit by default
    seed: 'phase4-demo' as string | undefined,
    acSeed: undefined as string | undefined,
    qlSeed: undefined as string | undefined,
    entropyCoefficient: 0.01,
    epsilonInitial: 0.3,
    epsilonDecayPerEpisode: 0.1,
    epsilonMinimum: 0.01,
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
    } else if (arg === '--threads' && next) {
      args.threadCount = Number(next)
      i++
    }
  }

  return args
}

const args = parseArgs(process.argv.slice(2))

if (args.seed) {
  setThreadRNGSeed(args.seed)
}

const acSeedBase = args.acSeed ?? args.seed
const qlSeedBase = args.qlSeed ?? args.seed

// Generate a random fallback seed when no seed is provided (matches old behavior
// where createRNG() without a seed uses crypto.getRandomValues).
const randomFallback = () => String(Math.floor(createRNG().gen() * 0x100000000))

const acLamarckSeed = `${acSeedBase ?? randomFallback()}:ac-lamarck`
const acDarwinSeed = `${acSeedBase ?? randomFallback()}:ac-darwin`
const qlSeed = `${qlSeedBase ?? randomFallback()}:q-learning`

// --- Build agent configs directly (replaces plugin buildAgentConfig) ---

const armCount = 3 // BanditEnvironment.armCount
const stepsPerEpisode = 20 // BanditEnvironment.stepsPerEpisode

const rolloutConfig: RolloutBufferConfig = {
  rolloutLength: 'episode',
  rewardThreshold: 0.1,
}

const acAgentConfig: ACAgentConfig = {
  learningRate: args.learningRate,
  actionCount: armCount,
  gradientConfig: {
    discountFactor: 0,
    entropyCoefficient: args.entropyCoefficient,
    clipGradients: false,
    gradientClipValue: 1.0,
  },
  rolloutConfig,
}

const qlAgentConfig: QLAgentConfig = {
  learningRate: args.learningRate,
  actionCount: armCount,
  discountFactor: 0,
  rolloutConfig,
  epsilonInitial: args.epsilonInitial,
  epsilonDecayPerEpisode: args.epsilonDecayPerEpisode,
  epsilonMinimum: args.epsilonMinimum,
}

/** Per-group output activation: 3 actor outputs (Softmax) + 1 critic output (Linear) */
const acOutputActivation: readonly [
  readonly [number, Activation],
  readonly [number, Activation],
] = [
  [3, Activation.Softmax],
  [1, Activation.Linear],
]

/** Worker config overrides for RL variants that need a trainable executor + agent factory. */
function rlEvaluatorConfig(
  agentFactoryPathname: string,
  agentFactoryOptions: Record<string, unknown>
): Partial<EvaluatorConfig> {
  return {
    createExecutorPathname: '@neat-evolution/executor/backprop',
    hydrateEnvironmentOptions: {
      createAgent: agentFactoryPathname,
    },
    environmentRuntimeData: {
      agentFactoryOptions,
    },
  }
}

const variants: VariantConfig[] = [
  {
    name: 'Vanilla',
    description: 'Baseline evolution via evaluate()',
    outputCount: 3,
    evaluatorConfig: {},
    genomeOptions: { outputActivation: Activation.Softmax },
    summary: {
      path: 'evaluate()',
      method: 'vanilla',
      options: {
        outputs: 3,
        agent: 'StaticExecutor',
      },
      seedLabel: args.seed ?? 'threadRNG()',
      notes: 'No RL updates, serves as the control run',
    },
  },
  {
    name: 'AC-Lamarck',
    description: 'Actor-Critic with Lamarckian writeback',
    outputCount: 4,
    evaluatorConfig: rlEvaluatorConfig('@neat-evolution/actor-critic/plugin', {
      config: acAgentConfig,
      rngSeed: acLamarckSeed,
      isLamarckian: true,
    }),
    genomeOptions: { outputActivation: acOutputActivation },
    summary: {
      path: 'evaluateAgent()',
      method: 'actor-critic',
      lamarckian: true,
      options: {
        rolloutLength: 'episode',
        entropy: args.entropyCoefficient,
      },
      seedLabel: acLamarckSeed,
      notes:
        'Augments evaluation with evaluateAgent() and writes trained weights back',
    },
  },
  {
    name: 'AC-Darwin',
    description: 'Actor-Critic without Lamarckian writeback',
    outputCount: 4,
    evaluatorConfig: rlEvaluatorConfig('@neat-evolution/actor-critic/plugin', {
      config: acAgentConfig,
      rngSeed: acDarwinSeed,
      isLamarckian: false,
    }),
    genomeOptions: { outputActivation: acOutputActivation },
    summary: {
      path: 'evaluateAgent()',
      method: 'actor-critic',
      lamarckian: false,
      options: {
        rolloutLength: 'episode',
        entropy: args.entropyCoefficient,
      },
      seedLabel: acDarwinSeed,
      notes:
        'Same AC config as Lamarckian run, but discards learned weights after evaluation',
    },
  },
  {
    name: 'Q-Learning',
    description: 'DQN-style epsilon-greedy training with Lamarckian writeback',
    outputCount: 3,
    evaluatorConfig: rlEvaluatorConfig('@neat-evolution/q-learning/plugin', {
      config: qlAgentConfig,
      rngSeed: qlSeed,
      isLamarckian: true,
    }),
    genomeOptions: { outputActivation: Activation.Linear },
    summary: {
      path: 'evaluateAgent()',
      method: 'q-learning',
      lamarckian: true,
      options: {
        epsilonInitial: args.epsilonInitial,
        epsilonDecay: args.epsilonDecayPerEpisode,
        epsilonMinimum: args.epsilonMinimum,
      },
      seedLabel: qlSeed,
      notes:
        'Uses evaluateAgent() with epsilon scheduling and rollout segments in episode mode',
    },
  },
]

console.log('=== Episodic Demo: Vanilla vs AC vs Q-Learning ===')
console.log(
  `Environment: Multi-arm bandit (3 episodes × ${stepsPerEpisode} steps)`
)
console.log(`Optimal average reward: 1.00`)
console.log(
  `Learning rate: ${args.learningRate}, Iterations: ${args.iterations}`
)
if (args.seconds > 0) {
  console.log(`Time limit: ${args.seconds}s per run`)
}
console.log(
  `Threads: ${args.threadCount != null ? args.threadCount : 'auto'}`
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

const CREATE_ENVIRONMENT_PATHNAME = '@neat-evolution/demo/bandit-environment'

async function runVariant(variant: VariantConfig): Promise<RunResult> {
  const fitnessLog: number[] = []
  const environment = new BanditEnvironment(variant.outputCount)

  const evaluatorConfig: EvaluatorConfig = {
    ...(args.threadCount != null ? { threadCount: args.threadCount } : {}),
    ...variant.evaluatorConfig,
  }

  const manager = new EvolutionManager({
    algorithm: NEATAlgorithm,
    environment,
    createEnvironmentPathname: CREATE_ENVIRONMENT_PATHNAME,
    ...(variant.genomeOptions != null
      ? {
          genomeOptions: {
            ...defaultNEATGenomeOptions,
            ...variant.genomeOptions,
          },
        }
      : {}),
    evolutionOptions: {
      ...defaultEvolutionOptions,
      iterations: args.iterations,
      secondsLimit: args.seconds,
      quiet: true,
      afterEvaluate: (population) => {
        const best = population.best()
        fitnessLog.push(best?.fitness ?? 0)
      },
    },
    populationOptions: {
      ...defaultPopulationOptions,
    },
    evaluatorConfig,
  })

  const start = performance.now()
  try {
    const best = await manager.evolve()
    const elapsedMs = performance.now() - start

    return {
      name: variant.name,
      fitnessLog,
      bestFitness: best?.fitness ?? 0,
      bestGenome: best?.genome as NEATGenome | undefined,
      elapsedMs,
    }
  } finally {
    await manager.terminate()
  }
}

// --- Run each variant ---

const results: RunResult[] = []
for (const variant of variants) {
  console.log(`Running: ${variant.name}...`)
  const result = await runVariant(variant)
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

const heldConstants = `Bandit env (3×${stepsPerEpisode}), iterations=${args.iterations}, learningRate=${args.learningRate}, rolloutLength='episode'`

summarizeComparison(
  'Vanilla evolution vs AC Lamarckian',
  vanilla,
  acLamarckian,
  `${heldConstants}, same genomes + evaluator, base seed=${args.seed ?? 'thread RNG'}`,
  'AC agent factory trains actor-critic minisodes, Lamarckian weight writeback'
)

summarizeComparison(
  'Vanilla evolution vs Q-Learning',
  vanilla,
  qLearning,
  `${heldConstants}, same genomes + evaluator, base seed=${args.seed ?? 'thread RNG'}`,
  'QL agent factory uses epsilon schedule + rollout segments, Lamarckian weight writeback'
)

summarizeComparison(
  'AC Lamarckian vs AC Darwinian',
  acDarwinian,
  acLamarckian,
  `${heldConstants}, identical actor-critic config + seeds`,
  'Only Lamarckian writeback differs (Darwinian discards learned weights)'
)
