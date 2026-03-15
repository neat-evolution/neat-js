/**
 * Backprop demo: NEAT evolution with per-genome backpropagation training.
 *
 * Non-Lamarckian (Baldwin Effect): each genome is trained via backprop during
 * evaluation, but trained weights are discarded afterward. This selects for
 * topologies and initial weights that are amenable to learning.
 *
 * Usage:
 *   yarn workspace @neat-evolution/demo backprop [--epochs N] [--lr N] [--iterations N] [--seconds N]
 */

import { createTrainer } from '@neat-evolution/backprop-strategy'
import {
  DatasetEnvironment,
  type DatasetOptions,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import { EvolutionManager } from '@neat-evolution/evolution-manager'
import { NEATAlgorithm } from '@neat-evolution/neat'

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

console.log('=== Backprop Demo (Non-Lamarckian / Baldwin Effect) ===')
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

// --- Run evolution ---

console.log('Starting NEAT evolution with backprop-enhanced evaluation...')
console.log()

try {
  const manager = new EvolutionManager({
    algorithm: NEATAlgorithm,
    environment,
    environmentRuntimeOptions: {
      trainerFactory: createTrainer,
      trainerFactoryOptions: {
        learningRate: args.learningRate,
        epochs: args.trainingEpochs,
        isLamarckian: false,
      },
    },
    evolutionOptions: {
      ...defaultEvolutionOptions,
      iterations: args.iterations,
      secondsLimit: args.seconds,
    },
    populationOptions: {
      ...defaultPopulationOptions,
    },
  })

  const best = await manager.evolve()
  await manager.terminate()

  console.log()
  console.log('=== Results ===')
  console.log(`Best fitness: ${best?.fitness ?? 'N/A'}`)
} catch (error) {
  console.error('Error:', error)
}
