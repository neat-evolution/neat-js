/**
 * Comparison demo: runs vanilla NEAT, Baldwinian (backprop, no writeback),
 * and Lamarckian (backprop + writeback) side by side on the Iris dataset.
 *
 * Vanilla NEAT evaluates fitness on the training split (no learning step, so
 * all non-held-out data is used for selection — matching the original Rust
 * implementation). Baldwinian and Lamarckian train on the training split and
 * score fitness on the validation split. Final results are reported on the
 * held-out test split for an unbiased comparison.
 *
 * Usage:
 *   yarn workspace @neat-evolution/demo compare [--epochs N] [--lr N] [--iterations N] [--seconds N]
 */

import {
  DatasetEnvironment,
  type DatasetOptions,
  defaultDatasetOptions,
  loadDataset,
  type Matrix,
  oneHotAccuracy,
} from '@neat-evolution/dataset-environment'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import {
  type EvaluatorConfig,
  EvolutionManager,
} from '@neat-evolution/evolution-manager'
import type { TrainerFactory } from '@neat-evolution/execution-manager'
import type { Executor, ExecutorFactory } from '@neat-evolution/executor'
import {
  createPhenotype,
  NEATAlgorithm,
  type NEATGenome,
} from '@neat-evolution/neat'

// --- Argument parsing ---

function parseArgs(argv: string[]) {
  const args = {
    trainingEpochs: 5,
    learningRate: 0.01,
    iterations: 200,
    seconds: 0, // no time limit by default — run all iterations
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === '--epochs' && next) {
      args.trainingEpochs = Number(next)
      i++
    } else if (arg === '--lr' && next) {
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

console.log('=== NEAT Comparison: Vanilla vs Baldwinian vs Lamarckian ===')
console.log(`Backprop: ${args.trainingEpochs} epochs, lr=${args.learningRate}`)
console.log(`Evolution: ${args.iterations} iterations`)
if (args.seconds > 0) {
  console.log(`Time limit: ${args.seconds}s per run`)
}
console.log()

// --- Load dataset ---

const datasetOptions: DatasetOptions = {
  ...defaultDatasetOptions,
  dataset: new URL('../../../../generated/iris', import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1,
}

const dataset = await loadDataset(datasetOptions)

console.log(
  `Dataset: iris (${dataset.trainingCount} train, ${dataset.validationCount} val, ${dataset.testCount} test)`
)
console.log(
  `Vanilla fitness: training split | Backprop fitness: validation split | Final: test split`
)
console.log()

const environment = new DatasetEnvironment(dataset)

// --- Run each variant ---

interface RunResult {
  name: string
  fitnessLog: number[]
  bestFitness: number
  bestGenome: NEATGenome | undefined
  elapsedMs: number
  evaluatorConfig: Partial<EvaluatorConfig>
}

const CREATE_ENVIRONMENT_PATHNAME = '@neat-evolution/dataset-environment'

function backpropEvaluatorConfig(
  trainerOptions: Record<string, unknown>
): Partial<EvaluatorConfig> {
  return {
    createExecutorPathname: '@neat-evolution/executor/backprop',
    hydrateEnvironmentOptions: {
      createTrainer: '@neat-evolution/execution-manager/backprop',
    },
    environmentRuntimeData: {
      trainerFactoryOptions: trainerOptions,
    },
  }
}

async function runVariant(
  name: string,
  evaluatorConfigOverrides: Partial<EvaluatorConfig> = {}
): Promise<RunResult> {
  const fitnessLog: number[] = []

  const manager = new EvolutionManager({
    algorithm: NEATAlgorithm,
    environment,
    createEnvironmentPathname: CREATE_ENVIRONMENT_PATHNAME,
    ...(Object.keys(evaluatorConfigOverrides).length > 0
      ? { evaluatorConfig: evaluatorConfigOverrides }
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
  })

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
      evaluatorConfig: evaluatorConfigOverrides,
    }
  } finally {
    await manager.terminate()
  }
}

// Vanilla NEAT — fitness on training data (no learning step)
console.log('Running: Vanilla NEAT...')
const vanilla = await runVariant('Vanilla')
console.log(
  `  Done: ${vanilla.bestFitness.toFixed(6)} in ${(vanilla.elapsedMs / 1000).toFixed(1)}s`
)

// Baldwinian (backprop, no writeback) — train on training, fitness on validation
console.log('Running: Baldwinian (backprop, discard weights)...')
const baldwinian = await runVariant(
  'Baldwinian',
  backpropEvaluatorConfig({
    learningRate: args.learningRate,
    epochs: args.trainingEpochs,
    isLamarckian: false,
  })
)
console.log(
  `  Done: ${baldwinian.bestFitness.toFixed(6)} in ${(baldwinian.elapsedMs / 1000).toFixed(1)}s`
)

// Lamarckian (backprop + writeback) — train on training, fitness on validation
console.log('Running: Lamarckian (backprop + writeback)...')
const lamarckian = await runVariant(
  'Lamarckian',
  backpropEvaluatorConfig({
    learningRate: args.learningRate,
    epochs: args.trainingEpochs,
    isLamarckian: true,
  })
)
console.log(
  `  Done: ${lamarckian.bestFitness.toFixed(6)} in ${(lamarckian.elapsedMs / 1000).toFixed(1)}s`
)

// --- Fitness table ---

console.log()
console.log(
  '=== Fitness by Generation (Vanilla=training, Backprop=validation) ==='
)
console.log()

const results = [vanilla, baldwinian, lamarckian]

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
          ? val.toFixed(6).padStart(colWidth)
          : ''.padStart(colWidth)
      })
      .join('')
    console.log(`${String(i).padEnd(10)}${cols}`)
  }
}

console.log()
console.log(
  `${'Best'.padEnd(10)}${results.map((r) => r.bestFitness.toFixed(6).padStart(colWidth)).join('')}`
)
console.log(
  `${'Time'.padEnd(10)}${results.map((r) => `${(r.elapsedMs / 1000).toFixed(1)}s`.padStart(colWidth)).join('')}`
)
console.log(
  `${'ms/iter'.padEnd(10)}${results.map((r) => `${(r.elapsedMs / r.fitnessLog.length).toFixed(1)}`.padStart(colWidth)).join('')}`
)

// --- Test-set helpers ---

function evaluateOnTest(executor: Executor) {
  const predictions: Matrix = dataset.testInputs.map((input) =>
    executor.forward(input)
  )
  const fitness = environment.computeFitness(dataset.testTargets, predictions)
  const accuracy = oneHotAccuracy(dataset.testTargets, predictions)
  return { fitness, accuracy }
}

function formatTestResult(
  name: string,
  result: { fitness: number; accuracy: number }
) {
  return `${name.padEnd(12)} fitness: ${result.fitness.toFixed(6)}  accuracy: ${(result.accuracy * 100).toFixed(1)}%`
}

// --- Raw genome evaluation (no backprop) ---

console.log()
console.log('=== Raw Genome on Test Set (forward-only, no backprop) ===')
console.log()

for (const result of results) {
  if (!result.bestGenome) {
    console.log(`${result.name.padEnd(12)} no genome`)
    continue
  }

  const phenotype = createPhenotype(result.bestGenome)
  const executorMod = await import('@neat-evolution/executor')
  const executorFactory = executorMod.createExecutor as ExecutorFactory
  const executor = executorFactory(phenotype)

  console.log(formatTestResult(result.name, evaluateOnTest(executor)))
}

// --- Test-set evaluation with backprop ---

console.log()
console.log('=== Test Set Evaluation (held-out, unseen data) ===')
console.log()

for (const result of results) {
  if (!result.bestGenome) {
    console.log(`${result.name.padEnd(12)} no genome`)
    continue
  }

  const { evaluatorConfig } = result
  const phenotype = createPhenotype(result.bestGenome)

  // Hydrate executor factory from pathname (same as TestEvaluator.initGenomeFactory)
  const executorPathname =
    evaluatorConfig.createExecutorPathname ?? '@neat-evolution/executor'
  const executorMod = await import(executorPathname)
  const executorFactory = executorMod.createExecutor as ExecutorFactory
  const executor = executorFactory(phenotype)

  // Hydrate trainer if configured (backprop variants)
  const trainerPathname =
    evaluatorConfig.hydrateEnvironmentOptions?.createTrainer
  if (trainerPathname != null) {
    const trainerMod = await import(trainerPathname)
    const createTrainer = (trainerMod.default ??
      trainerMod.createTrainer) as TrainerFactory
    const trainerOptions = evaluatorConfig.environmentRuntimeData
      ?.trainerFactoryOptions as Record<string, unknown>
    if (trainerOptions == null) {
      throw new Error(`trainerFactoryOptions missing for ${result.name}`)
    }
    const trainer = createTrainer(executor, trainerOptions)
    trainer.train({
      inputs: dataset.trainingInputs,
      targets: dataset.trainingTargets,
      count: dataset.trainingCount,
    })
  }

  console.log(formatTestResult(result.name, evaluateOnTest(executor)))
}
