import { defaultEvolutionOptions, defaultPopulationOptions } from '@neat-evolution/evolution'
import {
  type EvaluatorConfig,
  EvolutionManager,
} from '@neat-evolution/evolution-manager'
import {
  defaultNEATGenomeOptions,
  NEATAlgorithm,
  type NEATGenome,
  type NEATGenomeOptions,
} from '@neat-evolution/neat'
import type {
  ActorCriticStepAgentConfig,
  QLearningStepAgentConfig,
} from '@neat-evolution/rl-core'
import { setThreadRNGSeed } from '@neat-evolution/utils'
import { Activation } from '@neat-evolution/core'
import { StepBanditEnvironment } from './StepBanditEnvironment.js'

function parseArgs(argv: string[]) {
  const args = {
    algorithm: 'actor-critic' as 'actor-critic' | 'q-learning',
    learningRate: 0.1,
    iterations: 100,
    seconds: 0,
    seed: 'phase11-step-demo' as string | undefined,
    entropyCoefficient: 0.01,
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
    } else if (arg === '--entropy' && next) {
      args.entropyCoefficient = Number(next)
      i++
    } else if (arg === '--threads' && next) {
      args.threadCount = Number(next)
      i++
    } else if (arg === '--algorithm' && next) {
      if (next === 'actor-critic' || next === 'q-learning') {
        args.algorithm = next
      } else {
        throw new Error(`Unknown step demo algorithm: ${next}`)
      }
      i++
    }
  }

  return args
}

interface RunResult {
  fitnessLog: number[]
  bestFitness: number
  bestGenome: NEATGenome | undefined
}

const args = parseArgs(process.argv.slice(2))

if (args.seed != null) {
  setThreadRNGSeed(args.seed)
}

const acConfig: ActorCriticStepAgentConfig = {
  learningRate: args.learningRate,
  actionCount: 3,
  gradientConfig: {
    discountFactor: 0,
    entropyCoefficient: args.entropyCoefficient,
    clipGradients: false,
    gradientClipValue: 1,
  },
  rolloutConfig: {
    rolloutLength: 'episode',
  },
}

const qlConfig: QLearningStepAgentConfig = {
  learningRate: args.learningRate,
  actionCount: 3,
  discountFactor: 0,
  epsilonInitial: 0.2,
  epsilonDecayPerEpisode: 1,
  epsilonMinimum: 0.2,
  rolloutConfig: {
    rolloutLength: 'episode',
  },
}

const stepPluginPathname =
  args.algorithm === 'q-learning'
    ? '@neat-evolution/rl-core/q-learning'
    : '@neat-evolution/rl-core/actor-critic'

const stepConfig = args.algorithm === 'q-learning' ? qlConfig : acConfig
const outputCount = args.algorithm === 'q-learning' ? 3 : 4

const evaluatorConfig: EvaluatorConfig = {
  ...(args.threadCount != null ? { threadCount: args.threadCount } : {}),
  createExecutorPathname: '@neat-evolution/executor/backprop',
  hydrateEnvironmentOptions: {
    createExecutionManager: stepPluginPathname,
  },
  environmentRuntimeData: {
    executionManagerFactoryOptions: {
      config: stepConfig,
      rngSeed: `${args.seed ?? 'step-demo'}:${args.algorithm}`,
      isLamarckian: true,
    },
  },
}

const outputActivation: NEATGenomeOptions['outputActivation'] =
  args.algorithm === 'q-learning'
    ? Activation.Linear
    : [
        [3, Activation.Softmax],
        [1, Activation.Linear],
      ]

const environment = new StepBanditEnvironment(outputCount)
const CREATE_ENVIRONMENT_PATHNAME = '@neat-evolution/demo/step-bandit-environment'

async function run(): Promise<RunResult> {
  const fitnessLog: number[] = []

  const manager = new EvolutionManager({
    algorithm: NEATAlgorithm,
    environment,
    createEnvironmentPathname: CREATE_ENVIRONMENT_PATHNAME,
    evaluatorConfig,
    genomeOptions: {
      ...defaultNEATGenomeOptions,
      outputActivation,
    },
    evolutionOptions: {
      ...defaultEvolutionOptions,
      iterations: args.iterations,
      secondsLimit: args.seconds,
      quiet: true,
      afterEvaluate: (population) => {
        fitnessLog.push(population.best()?.fitness ?? 0)
      },
    },
    populationOptions: {
      ...defaultPopulationOptions,
    },
  })

  try {
    const best = await manager.evolve()
    return {
      fitnessLog,
      bestFitness: best?.fitness ?? 0,
      bestGenome: best?.genome as NEATGenome | undefined,
    }
  } finally {
    await manager.terminate()
  }
}

const result = await run()

console.log(`Step ${args.algorithm} demo complete`)
console.log(`  Best fitness: ${result.bestFitness.toFixed(6)}`)
console.log(`  Evaluations: ${result.fitnessLog.length}`)
if (result.bestGenome != null) {
  console.log(`  Best genome outputs: ${result.bestGenome.outputs.size}`)
}
