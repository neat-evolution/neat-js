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

import { createTrainableExecutor } from '@neat-evolution/backprop'
import { BackpropPlugin } from '@neat-evolution/backprop-strategy'
import {
  DatasetEnvironment,
  type DatasetOptions,
  defaultDatasetOptions,
  loadDataset,
  type Matrix,
  oneHotAccuracy,
} from '@neat-evolution/dataset-environment'
import {
  type EvaluationStrategy,
  PluginStrategy,
} from '@neat-evolution/evaluation-strategy'
import type { AnyAlgorithm } from '@neat-evolution/evaluator'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import { EvolutionManager } from '@neat-evolution/evolution-manager'
import { createExecutor } from '@neat-evolution/executor'
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
}

async function runVariant(
  name: string,
  strategy?: EvaluationStrategy
): Promise<RunResult> {
  const fitnessLog: number[] = []

  const manager = new EvolutionManager({
    algorithm: NEATAlgorithm,
    environment,
    ...(strategy != null ? { strategy } : {}),
    evolutionOptions: {
      ...defaultEvolutionOptions,
      iterations: args.iterations,
      secondsLimit: args.seconds,
      logInterval: Number.MAX_SAFE_INTEGER, // suppress built-in logging
      afterEvaluate: (population) => {
        const best = population.best()
        fitnessLog.push(best?.fitness ?? 0)
      },
    },
    populationOptions: {
      ...defaultPopulationOptions,
    },
  })

  // Suppress evolve()'s built-in console.log output
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

// Vanilla NEAT — fitness on training data (no learning step)
console.log('Running: Vanilla NEAT...')
const vanilla = await runVariant('Vanilla')
console.log(
  `  Done: ${vanilla.bestFitness.toFixed(6)} in ${(vanilla.elapsedMs / 1000).toFixed(1)}s`
)

// Baldwinian (backprop, no writeback) — train on training, fitness on validation
console.log('Running: Baldwinian (backprop, discard weights)...')
const baldwinianPlugin = new BackpropPlugin(NEATAlgorithm as AnyAlgorithm, {
  trainingEpochs: args.trainingEpochs,
  learningRate: args.learningRate,
  isLamarckian: false,
})
const baldwinian = await runVariant(
  'Baldwinian',
  new PluginStrategy([baldwinianPlugin], {
    algorithm: NEATAlgorithm as AnyAlgorithm,
    environment,
  })
)
console.log(
  `  Done: ${baldwinian.bestFitness.toFixed(6)} in ${(baldwinian.elapsedMs / 1000).toFixed(1)}s`
)

// Lamarckian (backprop + writeback) — train on training, fitness on validation
console.log('Running: Lamarckian (backprop + writeback)...')
const lamarckianPlugin = new BackpropPlugin(NEATAlgorithm as AnyAlgorithm, {
  trainingEpochs: args.trainingEpochs,
  learningRate: args.learningRate,
  isLamarckian: true,
})
const lamarckian = await runVariant(
  'Lamarckian',
  new PluginStrategy([lamarckianPlugin], {
    algorithm: NEATAlgorithm as AnyAlgorithm,
    environment,
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

// --- Test-set evaluation ---

console.log()
console.log('=== Test Set Evaluation (held-out, unseen data) ===')
console.log()

for (const result of results) {
  if (!result.bestGenome) {
    console.log(`${result.name.padEnd(12)} no genome`)
    continue
  }

  const phenotype = createPhenotype(result.bestGenome)

  // For Baldwinian/Lamarckian, train the best genome before test evaluation
  // (Baldwinian trains fresh; Lamarckian genome already has trained weights)
  let predictions: Matrix

  if (result.name === 'Baldwinian') {
    // Baldwinian: must re-train since weights were discarded during evolution
    const trainable = createTrainableExecutor(phenotype)
    for (let epoch = 0; epoch < args.trainingEpochs; epoch++) {
      for (let s = 0; s < dataset.trainingCount; s++) {
        const input = dataset.trainingInputs[
          s
        ] as (typeof dataset.trainingInputs)[number]
        const target = dataset.trainingTargets[
          s
        ] as (typeof dataset.trainingTargets)[number]
        const output = trainable.forward(input)
        const errors = new Float64Array(output.length)
        for (let j = 0; j < output.length; j++) {
          errors[j] = (output[j] as number) - (target[j] as number)
        }
        trainable.backward(errors, args.learningRate)
      }
    }
    predictions = dataset.testInputs.map((input) => trainable.forward(input))
  } else if (result.name === 'Lamarckian') {
    // Lamarckian: genome already has trained weights, just build and evaluate
    const trainable = createTrainableExecutor(phenotype)
    predictions = dataset.testInputs.map((input) => trainable.forward(input))
  } else {
    // Vanilla: no training, just evaluate
    const executor = createExecutor(phenotype)
    predictions = dataset.testInputs.map((input) => executor.execute(input))
  }

  const testFitness = environment.computeFitness(
    dataset.testTargets,
    predictions
  )
  const testAccuracy = oneHotAccuracy(dataset.testTargets, predictions)

  console.log(
    `${result.name.padEnd(12)} fitness: ${testFitness.toFixed(6)}  accuracy: ${(testAccuracy * 100).toFixed(1)}%`
  )
}
