/**
 * HyperNEAT family comparison demo: runs all three HyperNEAT variants on the
 * Iris dataset in three training modes (Darwinian, Baldwinian, Lamarckian).
 *
 * - Darwinian: pure evolution, no backprop — fitness on training split
 * - Baldwinian: backprop trains the phenotype but weights are NOT written back
 *   to the genome. The genome's fitness reflects learned performance but the
 *   next generation starts from the unmodified genome. Fitness on validation.
 * - Lamarckian: backprop trains the phenotype AND writes weights back to the
 *   genome via WritebackPayload. Learned weights persist across generations.
 *   Fitness on validation.
 *
 * DES-HyperNEAT is run twice: with useBias=false (default) and useBias=true.
 *
 * Usage:
 *   yarn workspace @neat-evolution/demo compare-hyperneat [--epochs N] [--lr N] [--iterations N] [--seconds N]
 */

import { Activation, defaultNEATConfigOptions } from '@neat-evolution/core'
import {
  DatasetEnvironment,
  type DatasetOptions,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import {
  defaultDESHyperNEATGenomeOptions,
  defaultTopologyConfigOptions,
} from '@neat-evolution/des-hyperneat'
import { defaultESHyperNEATGenomeOptions } from '@neat-evolution/es-hyperneat'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import {
  type EvaluatorConfig,
  EvolutionManager,
  type EvolutionManagerOptions,
} from '@neat-evolution/evolution-manager'
import { defaultHyperNEATGenomeOptions } from '@neat-evolution/hyperneat'

// --- Argument parsing ---

function parseArgs(argv: string[]) {
  const args = {
    trainingEpochs: 5,
    learningRate: 0.01,
    iterations: 50,
    seconds: 0,
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

console.log('=== HyperNEAT Family Comparison ===')
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
  'Darwinian fitness: training split | Backprop fitness: validation split'
)
console.log()

const environment = new DatasetEnvironment(dataset)

// --- Types ---

type AlgorithmName = 'HyperNEAT' | 'ES-HyperNEAT' | 'DES-HyperNEAT'
type Mode = 'darwinian' | 'baldwinian' | 'lamarckian'

interface RunResult {
  name: string
  fitnessLog: number[]
  bestFitness: number
  elapsedMs: number
}

const CREATE_ENVIRONMENT_PATHNAME = '@neat-evolution/dataset-environment'

// --- Backprop config ---

function backpropConfig(trainerOptions: Record<string, unknown>): {
  evaluation: { options: Partial<EvaluatorConfig> }
  execution: {
    createExecutionManager: string
    executionManagerFactoryOptions: Record<string, unknown>
  }
} {
  return {
    evaluation: {
      options: {
        createExecutorPathname: '@neat-evolution/executor/backprop',
      },
    },
    execution: {
      createExecutionManager: '@neat-evolution/execution-manager/backprop',
      executionManagerFactoryOptions: trainerOptions,
    },
  }
}

// --- Per-algorithm genome options ---

// Shared substrate overrides for Iris.
// Iris: 4 inputs, 3 outputs (one-hot). Softmax output, Tanh hidden.
// Default hiddenActivation is Activation.None (identity) — we override to Tanh
// for nonlinearity in the substrate hidden layer.
// CPPN activations use the defaults (Step and Abs already excluded).
const sharedOverrides = {
  hiddenActivation: Activation.Tanh,
  outputActivation: [[3, Activation.Softmax]] as const,
  weightThreshold: 0.1,
}

// HyperNEAT: fixed substrate with 1 hidden layer of 4 nodes
const hnOptions = {
  ...defaultHyperNEATGenomeOptions,
  ...sharedOverrides,
  hiddenLayerSizes: [4],
}

// ES-HyperNEAT: discovered topology, same substrate activation overrides
const esOptions = {
  ...defaultESHyperNEATGenomeOptions,
  ...sharedOverrides,
}

// DES-HyperNEAT: per-CPPN substrate, needs topology + cppn config data
const desOptions = {
  ...defaultDESHyperNEATGenomeOptions,
  ...sharedOverrides,
}
const desOptionsBias = {
  ...desOptions,
  useBias: true,
}
const desConfigData = {
  neat: defaultTopologyConfigOptions,
  cppn: defaultNEATConfigOptions,
}

// --- Run variant ---

async function runVariant(
  name: string,
  algorithmName: AlgorithmName,
  mode: Mode,
  genomeOptionsOverrides?: EvolutionManagerOptions['algorithm']['genomeOptions'],
  configDataOverride?: EvolutionManagerOptions['algorithm']['configData']
): Promise<RunResult> {
  const fitnessLog: number[] = []

  const trainerConfig =
    mode === 'darwinian'
      ? {}
      : backpropConfig({
          learningRate: args.learningRate,
          epochs: args.trainingEpochs,
          isLamarckian: mode === 'lamarckian',
        })

  const managerOptions: EvolutionManagerOptions = {
    algorithm: {
      name: algorithmName,
      ...(genomeOptionsOverrides != null
        ? { genomeOptions: genomeOptionsOverrides }
        : {}),
      ...(configDataOverride != null ? { configData: configDataOverride } : {}),
    },
    environment: {
      config: environment,
      pathname: CREATE_ENVIRONMENT_PATHNAME,
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
        const best = population.best()
        fitnessLog.push(best?.fitness ?? 0)
      },
    },
    ...trainerConfig,
  }

  const manager = new EvolutionManager(managerOptions)

  const start = performance.now()
  try {
    const best = await manager.evolve()
    const elapsedMs = performance.now() - start

    return {
      name,
      fitnessLog,
      bestFitness: best?.fitness ?? 0,
      elapsedMs,
    }
  } finally {
    await manager.terminate()
  }
}

function logResult(result: RunResult) {
  console.log(
    `  Done: ${result.bestFitness.toFixed(6)} in ${(result.elapsedMs / 1000).toFixed(1)}s`
  )
}

// --- Run an algorithm group (darwinian, baldwinian, lamarckian) ---

interface GroupResult {
  label: string
  darwinian: RunResult
  baldwinian: RunResult
  lamarckian: RunResult
}

async function runGroup(
  label: string,
  shortName: string,
  algorithmName: AlgorithmName,
  genomeOptions?: EvolutionManagerOptions['algorithm']['genomeOptions'],
  configData?: EvolutionManagerOptions['algorithm']['configData']
): Promise<GroupResult> {
  console.log(`--- ${label} ---`)

  console.log(`Running: Darwinian ${shortName} (no backprop)...`)
  const darwinian = await runVariant(
    `Darwin-${shortName}`,
    algorithmName,
    'darwinian',
    genomeOptions,
    configData
  )
  logResult(darwinian)

  console.log(`Running: Baldwinian ${shortName} (backprop, no writeback)...`)
  const baldwinian = await runVariant(
    `Baldwin-${shortName}`,
    algorithmName,
    'baldwinian',
    genomeOptions,
    configData
  )
  logResult(baldwinian)

  console.log(`Running: Lamarckian ${shortName} (backprop + writeback)...`)
  const lamarckian = await runVariant(
    `Lamarck-${shortName}`,
    algorithmName,
    'lamarckian',
    genomeOptions,
    configData
  )
  logResult(lamarckian)

  console.log()
  return { label, darwinian, baldwinian, lamarckian }
}

// --- Run all groups ---

const hn = await runGroup('HyperNEAT', 'HN', 'HyperNEAT', hnOptions)

const es = await runGroup('ES-HyperNEAT', 'ES', 'ES-HyperNEAT', esOptions)

const des = await runGroup(
  'DES-HyperNEAT (no bias)',
  'DES',
  'DES-HyperNEAT',
  desOptions,
  desConfigData
)

const desB = await runGroup(
  'DES-HyperNEAT (useBias)',
  'DES+b',
  'DES-HyperNEAT',
  desOptionsBias,
  desConfigData
)

const groups = [hn, es, des, desB]

// --- Fitness table per group ---

console.log('=== Fitness by Generation ===')
console.log()

const colWidth = 14
const modes: Array<{ key: keyof Omit<GroupResult, 'label'>; header: string }> =
  [
    { key: 'darwinian', header: 'Darwinian' },
    { key: 'baldwinian', header: 'Baldwinian' },
    { key: 'lamarckian', header: 'Lamarckian' },
  ]

for (const group of groups) {
  console.log(`--- ${group.label} ---`)
  console.log(
    `${'Iter'.padEnd(6)}${modes.map((m) => m.header.padStart(colWidth)).join('')}`
  )
  console.log('-'.repeat(6 + modes.length * colWidth))

  const results = modes.map((m) => group[m.key])
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
      console.log(`${String(i).padEnd(6)}${cols}`)
    }
  }

  console.log(
    `${'Best'.padEnd(6)}${results.map((r) => r.bestFitness.toFixed(6).padStart(colWidth)).join('')}`
  )
  console.log(
    `${'Time'.padEnd(6)}${results.map((r) => `${(r.elapsedMs / 1000).toFixed(1)}s`.padStart(colWidth)).join('')}`
  )
  console.log(
    `${'ms/it'.padEnd(6)}${results.map((r) => `${(r.elapsedMs / r.fitnessLog.length).toFixed(1)}`.padStart(colWidth)).join('')}`
  )
  console.log()
}

// --- Summary table ---

console.log('=== Summary ===')
console.log()

const allResults: RunResult[] = []
for (const group of groups) {
  for (const mode of modes) {
    allResults.push(group[mode.key])
  }
}

const nameWidth = 18
console.log(
  `${'Variant'.padEnd(nameWidth)}${'Best'.padStart(12)}${'Time'.padStart(10)}${'ms/iter'.padStart(10)}`
)
console.log('-'.repeat(nameWidth + 32))

for (const result of allResults) {
  const itersRun = result.fitnessLog.length
  const timePerIter = result.elapsedMs / itersRun
  console.log(
    `${result.name.padEnd(nameWidth)}${result.bestFitness.toFixed(6).padStart(12)}${`${(result.elapsedMs / 1000).toFixed(1)}s`.padStart(10)}${`${timePerIter.toFixed(0)}ms`.padStart(10)}`
  )
}

console.log()
console.log('Darwinian:  pure evolution, no backprop')
console.log('Baldwinian: backprop trains phenotype, weights discarded')
console.log('Lamarckian: backprop + writeback to genome')
console.log(
  'DES+b:      DES-HyperNEAT with useBias=true (substrate node biases)'
)
