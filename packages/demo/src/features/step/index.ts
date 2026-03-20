import { Activation } from '@neat-evolution/core'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import {
  type EvaluatorConfig,
  EvolutionManager,
} from '@neat-evolution/evolution-manager'
import {
  defaultNEATGenomeOptions,
  type NEATGenome,
  type NEATGenomeOptions,
} from '@neat-evolution/neat'
import type {
  A2CStepAgentConfig,
  ActorCriticStepAgentConfig,
  DeepQLearningStepAgentConfig,
  PPOStepAgentConfig,
  QLearningStepAgentConfig,
} from '@neat-evolution/rl-core'
import { createRNG } from '@neat-evolution/utils'
import { StepControlEnvironment } from '../step-control/StepControlEnvironment.js'
import { StepBanditEnvironment } from './StepBanditEnvironment.js'

type StepAlgorithm =
  | 'actor-critic'
  | 'n-step-actor-critic'
  | 'q-learning'
  | 'dql'
  | 'a2c'
  | 'ppo'

type StepEnvironmentKind = 'bandit' | 'control'

function parseArgs(argv: string[]) {
  const args = {
    algorithm: 'actor-critic' as StepAlgorithm,
    environment: 'bandit' as StepEnvironmentKind,
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
      if (
        next === 'actor-critic' ||
        next === 'n-step-actor-critic' ||
        next === 'q-learning' ||
        next === 'dql' ||
        next === 'a2c' ||
        next === 'ppo'
      ) {
        args.algorithm = next
      } else {
        throw new Error(`Unknown step demo algorithm: ${next}`)
      }
      i++
    } else if (arg === '--environment' && next) {
      if (next === 'bandit' || next === 'control') {
        args.environment = next
      } else {
        throw new Error(`Unknown step demo environment: ${next}`)
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

const rootRng = args.seed != null ? createRNG(args.seed) : createRNG()

const actionCount = args.environment === 'control' ? 2 : 3
const discountFactor = args.environment === 'control' ? 0.9 : 0

const acConfig: ActorCriticStepAgentConfig = {
  learningRate: args.learningRate,
  actionCount,
  variant: args.algorithm === 'n-step-actor-critic' ? 'n-step' : 'one-step',
  ...(args.algorithm === 'n-step-actor-critic' ? { nStepHorizon: 3 } : {}),
  gradientConfig: {
    discountFactor,
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
  actionCount,
  discountFactor,
  epsilonInitial: 0.2,
  epsilonDecayPerEpisode: 1,
  epsilonMinimum: 0.2,
  rolloutConfig: {
    rolloutLength: 'episode',
  },
}

const dqlConfig: DeepQLearningStepAgentConfig = {
  learningRate: args.learningRate,
  actionCount,
  discountFactor,
  epsilonInitial: 0.2,
  epsilonDecayPerEpisode: 0.98,
  epsilonMinimum: 0.05,
  replayCapacity: 128,
  replayBatchSize: 8,
  replayWarmupSize: 8,
  trainEverySteps: 1,
  gradientStepsPerUpdate: 1,
  targetSyncInterval: 4,
}

const a2cConfig: A2CStepAgentConfig = {
  learningRate: args.learningRate,
  actionCount,
  discountFactor,
  gaeLambda: 0.95,
  normalizeAdvantages: true,
  gradientConfig: {
    entropyCoefficient: args.entropyCoefficient,
    clipGradients: false,
    gradientClipValue: 1,
  },
  trajectoryConfig: {
    rolloutLength: 'episode',
    batchTransitions: args.environment === 'control' ? 12 : 30,
  },
}

const ppoConfig: PPOStepAgentConfig = {
  learningRate: args.learningRate,
  actionCount,
  discountFactor,
  clipEpsilon: 0.2,
  entropyCoefficient: args.entropyCoefficient,
  gaeLambda: 0.95,
  normalizeAdvantages: true,
  minibatchSize: args.environment === 'control' ? 4 : 6,
  epochs: 3,
  trajectoryConfig: {
    rolloutLength: 'episode',
    batchTransitions: args.environment === 'control' ? 12 : 30,
  },
}

const stepPluginPathname: string = {
  'actor-critic': '@neat-evolution/rl-core/actor-critic',
  'n-step-actor-critic': '@neat-evolution/rl-core/actor-critic',
  'q-learning': '@neat-evolution/rl-core/q-learning',
  dql: '@neat-evolution/rl-core/dql',
  a2c: '@neat-evolution/rl-core/a2c',
  ppo: '@neat-evolution/rl-core/ppo',
}[args.algorithm]

const stepConfig:
  | ActorCriticStepAgentConfig
  | QLearningStepAgentConfig
  | DeepQLearningStepAgentConfig
  | A2CStepAgentConfig
  | PPOStepAgentConfig = {
  'actor-critic': acConfig,
  'n-step-actor-critic': acConfig,
  'q-learning': qlConfig,
  dql: dqlConfig,
  a2c: a2cConfig,
  ppo: ppoConfig,
}[args.algorithm]

const outputCount =
  args.algorithm === 'q-learning' || args.algorithm === 'dql'
    ? actionCount
    : actionCount + 1

const evaluatorConfig: EvaluatorConfig = {
  ...(args.threadCount != null ? { threadCount: args.threadCount } : {}),
  createExecutorPathname: '@neat-evolution/executor/backprop',
  hydrateEnvironmentOptions: {
    createExecutionManager: stepPluginPathname,
  },
  environmentRuntimeData: {
    executionManagerFactoryOptions: {
      config: stepConfig,
      isLamarckian: true,
    },
  },
}

const outputActivation: NEATGenomeOptions['outputActivation'] =
  args.algorithm === 'q-learning' || args.algorithm === 'dql'
    ? Activation.Linear
    : [
        [actionCount, Activation.Softmax],
        [1, Activation.Linear],
      ]

const environment =
  args.environment === 'control'
    ? new StepControlEnvironment(outputCount)
    : new StepBanditEnvironment(outputCount)
const environmentPathname =
  args.environment === 'control'
    ? '@neat-evolution/demo/step-control-environment'
    : '@neat-evolution/demo/step-bandit-environment'

async function run(): Promise<RunResult> {
  const fitnessLog: number[] = []

  const manager = new EvolutionManager({
    algorithm: {
      name: 'NEAT',
      genomeOptions: {
        ...defaultNEATGenomeOptions,
        outputActivation,
      },
    },
    environment: {
      config: environment,
      pathname: environmentPathname,
    },
    population: {
      options: {
        ...defaultPopulationOptions,
      },
    },
    evolution: {
      ...defaultEvolutionOptions,
      iterations: args.iterations,
      secondsLimit: args.seconds,
      quiet: true,
      afterEvaluate: (population) => {
        fitnessLog.push(population.best()?.fitness ?? 0)
      },
    },
    evaluation: {
      options: {
        ...(evaluatorConfig.createExecutorPathname != null
          ? { createExecutorPathname: evaluatorConfig.createExecutorPathname }
          : {}),
        ...(evaluatorConfig.threadCount != null
          ? { threadCount: evaluatorConfig.threadCount }
          : {}),
      },
    },
    execution: {
      createExecutionManager:
        evaluatorConfig.hydrateEnvironmentOptions?.createExecutionManager ??
        stepPluginPathname,
      executionManagerFactoryOptions:
        (evaluatorConfig.environmentRuntimeData
          ?.executionManagerFactoryOptions as Record<string, unknown>) ?? {},
    },
    rng: rootRng,
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
console.log(`  Environment: ${args.environment}`)
console.log(`  Best fitness: ${result.bestFitness.toFixed(6)}`)
console.log(`  Evaluations: ${result.fitnessLog.length}`)
if (result.bestGenome != null) {
  console.log(`  Best genome outputs: ${result.bestGenome.outputs.size}`)
}
