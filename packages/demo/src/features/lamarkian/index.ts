/**
 * Lamarckian demo: NEAT evolution with per-genome backpropagation training
 * and weight writeback.
 *
 * Lamarckian evolution: each genome is trained via backprop during evaluation,
 * and the trained weights are written back to the genome. Offspring inherit
 * the learned weights as their starting point, so the population accumulates
 * learned knowledge across generations.
 *
 * Usage:
 *   yarn workspace @neat-evolution/demo lamarkian [--epochs N] [--lr N] [--iterations N] [--seconds N]
 */

import { BackpropStrategy } from '@neat-evolution/backprop-strategy'
import { defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  DatasetEnvironment,
  type DatasetOptions,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import type { AnyAlgorithm } from '@neat-evolution/evaluator'
import { createEvaluator } from '@neat-evolution/evaluator'
import {
  createReproducer,
  defaultEvolutionOptions,
  defaultPopulationOptions,
  type EvolutionOptions,
} from '@neat-evolution/evolution'
import { createExecutor } from '@neat-evolution/executor'
import {
  defaultNEATGenomeOptions,
  NEATAlgorithm,
  type NEATReproducerFactory,
  neat,
} from '@neat-evolution/neat'

// --- Argument parsing ---

function parseArgs(argv: string[]) {
  const args = {
    trainingEpochs: 10,
    learningRate: 0.01,
    iterations: 10,
    seconds: 30,
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

console.log('=== Lamarckian Demo (Backprop + Weight Writeback) ===')
console.log(
  `Training epochs: ${args.trainingEpochs}, Learning rate: ${args.learningRate}`
)
console.log(
  `Evolution iterations: ${args.iterations}, Time limit: ${args.seconds}s`
)
console.log()

// --- Load dataset ---

const datasetOptions: DatasetOptions = {
  ...defaultDatasetOptions,
  dataset: new URL('../../../../generated/iris', import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1,
}

const dataset = await loadDataset(datasetOptions)
const environment = new DatasetEnvironment(dataset)

console.log(
  `Dataset: iris (${dataset.trainingCount} training, ${dataset.validationCount} validation, ${dataset.testCount} test)`
)
console.log(
  `Inputs: ${dataset.dimensions.inputs}, Outputs: ${dataset.dimensions.outputs}`
)
console.log()

// --- Configure evolution ---

const evolutionOptions: EvolutionOptions = {
  ...defaultEvolutionOptions,
  iterations: args.iterations,
  secondsLimit: args.seconds,
}

const populationOptions = {
  ...defaultPopulationOptions,
}

// --- Create evaluator with BackpropStrategy ---

const strategy = new BackpropStrategy(
  NEATAlgorithm as AnyAlgorithm,
  environment,
  {
    trainingEpochs: args.trainingEpochs,
    learningRate: args.learningRate,
    isLamarckian: true,
  }
)

const evaluator = createEvaluator(NEATAlgorithm as AnyAlgorithm, environment, {
  createExecutor,
  strategy,
})

// --- Run evolution ---

console.log(
  'Starting NEAT evolution with Lamarckian backprop (weight writeback)...'
)
console.log()

try {
  const best = await neat(
    createReproducer as NEATReproducerFactory,
    evaluator,
    evolutionOptions,
    defaultNEATConfigOptions,
    populationOptions,
    defaultNEATGenomeOptions
  )

  console.log()
  console.log('=== Results ===')
  console.log(`Best fitness: ${best?.fitness ?? 'N/A'}`)
} catch (error) {
  console.error('Error:', error)
}
