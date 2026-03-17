import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'
import { Organism } from '@neat-evolution/evolution'
import { createExecutor } from '@neat-evolution/executor'
import {
  createEvaluator as createWorkerEvaluator,
  requestEvaluateBatch,
  requestEvaluateGenome,
  terminate as terminateEvaluatorAction,
  WorkerEvaluator,
} from '@neat-evolution/worker-evaluator'
import {
  createReproducerFactory,
  requestBreedOrganism,
  requestEliteOrganism,
  terminate as terminateReproducerAction,
  WorkerReproducer,
} from '@neat-evolution/worker-reproducer'
import { hardwareConcurrency } from '@neat-evolution/worker-threads'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== '--')
  const defaultThreadCount = Math.max(1, Math.min(4, hardwareConcurrency - 1))
  const options = {
    output: '.artifacts/analysis/worker-pipeline-experiment.json',
    method: 'DES-HyperNEAT',
    runs: 3,
    iterations: 200,
    initialMutations: null,
    secondsLimit: 30,
    threadCount: defaultThreadCount,
    taskCount: 100,
    quietTraining: true,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--output' && args[i + 1]) {
      options.output = args[++i]
    } else if (arg === '--method' && args[i + 1]) {
      options.method = args[++i]
    } else if (arg === '--runs' && args[i + 1]) {
      options.runs = Number(args[++i])
    } else if (arg === '--iterations' && args[i + 1]) {
      options.iterations = Number(args[++i])
    } else if (arg === '--initialMutations' && args[i + 1]) {
      options.initialMutations = Number(args[++i])
    } else if (arg === '--secondsLimit' && args[i + 1]) {
      options.secondsLimit = Number(args[++i])
    } else if (arg === '--threadCount' && args[i + 1]) {
      options.threadCount = Number(args[++i])
    } else if (arg === '--taskCount' && args[i + 1]) {
      options.taskCount = Number(args[++i])
    } else if (arg === '--quiet-training') {
      options.quietTraining = true
    } else if (arg === '--verbose-training') {
      options.quietTraining = false
    }
  }

  options.output = resolve(packageRoot, options.output)
  options.runs = Math.max(
    1,
    Number.isFinite(options.runs) ? Math.floor(options.runs) : 3
  )
  options.iterations = Math.max(
    1,
    Number.isFinite(options.iterations) ? options.iterations : 200
  )
  options.secondsLimit = Math.max(
    1,
    Number.isFinite(options.secondsLimit) ? options.secondsLimit : 30
  )
  options.threadCount = Math.max(
    1,
    Number.isFinite(options.threadCount)
      ? options.threadCount
      : defaultThreadCount
  )
  options.taskCount = Math.max(
    1,
    Number.isFinite(options.taskCount) ? options.taskCount : 100
  )
  if (!Number.isFinite(options.initialMutations)) {
    options.initialMutations = null
  }
  return options
}

function nowMs() {
  return Number(process.hrtime.bigint()) / 1_000_000
}

function snapshotMemory() {
  const usage = process.memoryUsage()
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
  }
}

function createMetric() {
  return {
    count: 0,
    totalMs: 0,
    minMs: Infinity,
    maxMs: 0,
    values: [],
    rssDeltaBytesTotal: 0,
    heapDeltaBytesTotal: 0,
  }
}

function createPayloadMetric() {
  return {
    count: 0,
    totalBytes: 0,
    minBytes: Infinity,
    maxBytes: 0,
    values: [],
  }
}

function estimatePayloadBytes(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), 'utf8')
  } catch {
    return 0
  }
}

function recordPayloadMetric(metric, bytes) {
  metric.count += 1
  metric.totalBytes += bytes
  metric.minBytes = Math.min(metric.minBytes, bytes)
  metric.maxBytes = Math.max(metric.maxBytes, bytes)
  metric.values.push(bytes)
}

function recordMetric(metric, elapsedMs, before, after) {
  metric.count += 1
  metric.totalMs += elapsedMs
  metric.minMs = Math.min(metric.minMs, elapsedMs)
  metric.maxMs = Math.max(metric.maxMs, elapsedMs)
  metric.values.push(elapsedMs)
  if (before && after) {
    metric.rssDeltaBytesTotal += after.rss - before.rss
    metric.heapDeltaBytesTotal += after.heapUsed - before.heapUsed
  }
}

function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.max(
    0,
    Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))
  )
  return sorted[idx] ?? 0
}

function metricSummary(metric) {
  const meanMs = metric.count > 0 ? metric.totalMs / metric.count : 0
  return {
    count: metric.count,
    totalMs: Number(metric.totalMs.toFixed(3)),
    meanMs: Number(meanMs.toFixed(3)),
    p95Ms: Number(percentile(metric.values, 0.95).toFixed(3)),
    minMs: Number(
      (Number.isFinite(metric.minMs) ? metric.minMs : 0).toFixed(3)
    ),
    maxMs: Number(metric.maxMs.toFixed(3)),
    meanRssDeltaKB: Number(
      (metric.count > 0
        ? metric.rssDeltaBytesTotal / metric.count / 1024
        : 0
      ).toFixed(3)
    ),
    meanHeapDeltaKB: Number(
      (metric.count > 0
        ? metric.heapDeltaBytesTotal / metric.count / 1024
        : 0
      ).toFixed(3)
    ),
  }
}

function payloadMetricSummary(metric) {
  const meanBytes = metric.count > 0 ? metric.totalBytes / metric.count : 0
  return {
    count: metric.count,
    totalKB: Number((metric.totalBytes / 1024).toFixed(3)),
    meanKB: Number((meanBytes / 1024).toFixed(3)),
    p95KB: Number((percentile(metric.values, 0.95) / 1024).toFixed(3)),
    minKB: Number(
      ((Number.isFinite(metric.minBytes) ? metric.minBytes : 0) / 1024).toFixed(
        3
      )
    ),
    maxKB: Number((metric.maxBytes / 1024).toFixed(3)),
  }
}

function createTracker() {
  return {
    startedAt: new Date().toISOString(),
    metrics: {
      reproducerMainHandlePopulationSelectSerialize: createMetric(),
      reproducerMainHandleSpeciesSelectSerialize: createMetric(),
      reproducerMainEliteSerializeRequest: createMetric(),
      reproducerMainEliteRpcWait: createMetric(),
      reproducerMainEliteHydrateAndPush: createMetric(),
      reproducerMainBreedRpcWait: createMetric(),
      reproducerMainBreedHydrateAndPush: createMetric(),
      evaluatorMainSerializeSingle: createMetric(),
      evaluatorMainRpcSingle: createMetric(),
      evaluatorMainSerializeBatch: createMetric(),
      evaluatorMainRpcBatch: createMetric(),
    },
    payloadMetrics: {
      reproducerMainRequestPopulationSelectInKB: createPayloadMetric(),
      reproducerMainResponsePopulationSelectOutKB: createPayloadMetric(),
      reproducerMainRequestSpeciesSelectInKB: createPayloadMetric(),
      reproducerMainResponseSpeciesSelectOutKB: createPayloadMetric(),
      reproducerMainRequestEliteOutKB: createPayloadMetric(),
      reproducerMainResponseEliteInKB: createPayloadMetric(),
      reproducerMainRequestBreedOutKB: createPayloadMetric(),
      reproducerMainResponseBreedInKB: createPayloadMetric(),
      evaluatorMainRequestSingleOutKB: createPayloadMetric(),
      evaluatorMainResponseSingleInKB: createPayloadMetric(),
      evaluatorMainRequestBatchOutKB: createPayloadMetric(),
      evaluatorMainResponseBatchInKB: createPayloadMetric(),
    },
    runs: [],
  }
}

function installPatches(tracker) {
  const originals = {
    handleRequestPopulationTournamentSelect:
      WorkerReproducer.prototype.handleRequestPopulationTournamentSelect,
    handleRequestSpeciesTournamentSelect:
      WorkerReproducer.prototype.handleRequestSpeciesTournamentSelect,
    eliteOrganism: WorkerReproducer.prototype.eliteOrganism,
    breedOrganism: WorkerReproducer.prototype.breedOrganism,
    evaluateGenomeEntry: WorkerEvaluator.prototype.evaluateGenomeEntry,
    evaluateGenomeEntryBatch:
      WorkerEvaluator.prototype.evaluateGenomeEntryBatch,
    reproducerTerminate: WorkerReproducer.prototype.terminate,
    evaluatorTerminate: WorkerEvaluator.prototype.terminate,
  }

  WorkerReproducer.prototype.handleRequestPopulationTournamentSelect =
    function (action, context) {
      recordPayloadMetric(
        tracker.payloadMetrics.reproducerMainRequestPopulationSelectInKB,
        estimatePayloadBytes(action?.payload)
      )
      const wrappedContext = {
        ...context,
        send: (message) => {
          recordPayloadMetric(
            tracker.payloadMetrics.reproducerMainResponsePopulationSelectOutKB,
            estimatePayloadBytes(message?.payload)
          )
          context.send(message)
        },
      }
      const before = snapshotMemory()
      const t0 = nowMs()
      const result = originals.handleRequestPopulationTournamentSelect.call(
        this,
        action,
        wrappedContext
      )
      const elapsed = nowMs() - t0
      const after = snapshotMemory()
      recordMetric(
        tracker.metrics.reproducerMainHandlePopulationSelectSerialize,
        elapsed,
        before,
        after
      )
      return result
    }

  WorkerReproducer.prototype.handleRequestSpeciesTournamentSelect = function (
    action,
    context
  ) {
    recordPayloadMetric(
      tracker.payloadMetrics.reproducerMainRequestSpeciesSelectInKB,
      estimatePayloadBytes(action?.payload)
    )
    const wrappedContext = {
      ...context,
      send: (message) => {
        recordPayloadMetric(
          tracker.payloadMetrics.reproducerMainResponseSpeciesSelectOutKB,
          estimatePayloadBytes(message?.payload)
        )
        context.send(message)
      },
    }
    const before = snapshotMemory()
    const t0 = nowMs()
    const result = originals.handleRequestSpeciesTournamentSelect.call(
      this,
      action,
      wrappedContext
    )
    const elapsed = nowMs() - t0
    const after = snapshotMemory()
    recordMetric(
      tracker.metrics.reproducerMainHandleSpeciesSelectSerialize,
      elapsed,
      before,
      after
    )
    return result
  }

  WorkerReproducer.prototype.eliteOrganism = async function (organism) {
    await this.initPromise

    let before = snapshotMemory()
    let t0 = nowMs()
    const requestPayload = {
      genome: organism.genome.toFactoryOptions(),
      organismState: organism.toFactoryOptions(),
    }
    recordPayloadMetric(
      tracker.payloadMetrics.reproducerMainRequestEliteOutKB,
      estimatePayloadBytes(requestPayload)
    )
    let after = snapshotMemory()
    recordMetric(
      tracker.metrics.reproducerMainEliteSerializeRequest,
      nowMs() - t0,
      before,
      after
    )

    t0 = nowMs()
    const data = await this.dispatcher.call(
      requestEliteOrganism(requestPayload)
    )
    recordPayloadMetric(
      tracker.payloadMetrics.reproducerMainResponseEliteInKB,
      estimatePayloadBytes(data)
    )
    recordMetric(
      tracker.metrics.reproducerMainEliteRpcWait,
      nowMs() - t0,
      after,
      snapshotMemory()
    )

    before = snapshotMemory()
    t0 = nowMs()
    const genome = this.population.algorithm.createGenome(
      this.population.configProvider,
      this.population.stateProvider,
      this.population.genomeOptions,
      this.population.initConfig,
      data.genome
    )
    const elite = new Organism(
      genome,
      data.organismState.generation,
      data.organismState
    )
    this.population.push(elite, true)
    after = snapshotMemory()
    recordMetric(
      tracker.metrics.reproducerMainEliteHydrateAndPush,
      nowMs() - t0,
      before,
      after
    )
    return elite
  }

  WorkerReproducer.prototype.breedOrganism = async function (speciesId) {
    await this.initPromise

    const beforeRpc = snapshotMemory()
    const tRpc = nowMs()
    const breedRequest = { speciesId }
    recordPayloadMetric(
      tracker.payloadMetrics.reproducerMainRequestBreedOutKB,
      estimatePayloadBytes(breedRequest)
    )
    const data = await this.dispatcher.call(requestBreedOrganism(breedRequest))
    recordPayloadMetric(
      tracker.payloadMetrics.reproducerMainResponseBreedInKB,
      estimatePayloadBytes(data)
    )
    const afterRpc = snapshotMemory()
    recordMetric(
      tracker.metrics.reproducerMainBreedRpcWait,
      nowMs() - tRpc,
      beforeRpc,
      afterRpc
    )

    const beforeHydrate = snapshotMemory()
    const tHydrate = nowMs()
    const genome = this.population.algorithm.createGenome(
      this.population.configProvider,
      this.population.stateProvider,
      this.population.genomeOptions,
      this.population.initConfig,
      data.genome
    )
    const organism = new Organism(
      genome,
      data.organismState.generation,
      data.organismState
    )
    this.population.push(organism, true)
    const afterHydrate = snapshotMemory()
    recordMetric(
      tracker.metrics.reproducerMainBreedHydrateAndPush,
      nowMs() - tHydrate,
      beforeHydrate,
      afterHydrate
    )

    return organism
  }

  WorkerEvaluator.prototype.evaluateGenomeEntry = async function (
    genomeEntry,
    seed
  ) {
    await this.initPromise
    const [, , genome] = genomeEntry

    const before = snapshotMemory()
    let t0 = nowMs()
    const genomeOptions = genome.toFactoryOptions()
    recordPayloadMetric(
      tracker.payloadMetrics.evaluatorMainRequestSingleOutKB,
      estimatePayloadBytes({ genomeOptions, seed })
    )
    const after = snapshotMemory()
    recordMetric(
      tracker.metrics.evaluatorMainSerializeSingle,
      nowMs() - t0,
      before,
      after
    )

    t0 = nowMs()
    const fitness = await this.dispatcher.call(
      requestEvaluateGenome({ genomeOptions, seed })
    )
    recordPayloadMetric(
      tracker.payloadMetrics.evaluatorMainResponseSingleInKB,
      estimatePayloadBytes(fitness)
    )
    recordMetric(
      tracker.metrics.evaluatorMainRpcSingle,
      nowMs() - t0,
      after,
      snapshotMemory()
    )

    const [speciesIndex, organismIndex] = genomeEntry
    return [speciesIndex, organismIndex, fitness]
  }

  WorkerEvaluator.prototype.evaluateGenomeEntryBatch = async function (
    genomeEntries,
    seed
  ) {
    await this.initPromise

    const before = snapshotMemory()
    let t0 = nowMs()
    const genomeFactoryOptions = genomeEntries.map(([, , genome]) =>
      genome.toFactoryOptions()
    )
    recordPayloadMetric(
      tracker.payloadMetrics.evaluatorMainRequestBatchOutKB,
      estimatePayloadBytes({ genomeOptions: genomeFactoryOptions, seed })
    )
    const after = snapshotMemory()
    recordMetric(
      tracker.metrics.evaluatorMainSerializeBatch,
      nowMs() - t0,
      before,
      after
    )

    t0 = nowMs()
    const fitnessScores = await this.dispatcher.call(
      requestEvaluateBatch({ genomeOptions: genomeFactoryOptions, seed })
    )
    recordPayloadMetric(
      tracker.payloadMetrics.evaluatorMainResponseBatchInKB,
      estimatePayloadBytes(fitnessScores)
    )
    recordMetric(
      tracker.metrics.evaluatorMainRpcBatch,
      nowMs() - t0,
      after,
      snapshotMemory()
    )

    return genomeEntries.map(([speciesIndex, organismIndex], index) => [
      speciesIndex,
      organismIndex,
      fitnessScores[index],
    ])
  }

  WorkerReproducer.prototype.terminate = async function () {
    await this.initPromise
    await this.dispatcher.broadcast(terminateReproducerAction())
    await this.pool.terminate()
  }

  WorkerEvaluator.prototype.terminate = async function () {
    await this.initPromise
    await this.dispatcher.broadcast(terminateEvaluatorAction())
    await this.pool.terminate()
  }

  return () => {
    WorkerReproducer.prototype.handleRequestPopulationTournamentSelect =
      originals.handleRequestPopulationTournamentSelect
    WorkerReproducer.prototype.handleRequestSpeciesTournamentSelect =
      originals.handleRequestSpeciesTournamentSelect
    WorkerReproducer.prototype.eliteOrganism = originals.eliteOrganism
    WorkerReproducer.prototype.breedOrganism = originals.breedOrganism
    WorkerEvaluator.prototype.evaluateGenomeEntry =
      originals.evaluateGenomeEntry
    WorkerEvaluator.prototype.evaluateGenomeEntryBatch =
      originals.evaluateGenomeEntryBatch
    WorkerReproducer.prototype.terminate = originals.reproducerTerminate
    WorkerEvaluator.prototype.terminate = originals.evaluatorTerminate
  }
}

async function withMaybeSilencedTrainingLogs(quietTraining, fn) {
  if (!quietTraining) return await fn()
  const originalLog = console.log
  const originalInfo = console.info
  const originalDebug = console.debug
  const originalWarn = console.warn
  console.log = () => {}
  console.info = () => {}
  console.debug = () => {}
  console.warn = () => {}
  try {
    return await fn()
  } finally {
    console.log = originalLog
    console.info = originalInfo
    console.debug = originalDebug
    console.warn = originalWarn
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const tracker = createTracker()
  const uninstall = installPatches(tracker)

  try {
    const { demo, Methods } = await import('../dist/esm/demo.js')
    const method = Object.values(Methods).includes(options.method)
      ? options.method
      : Methods.DES_HyperNEAT

    for (let runIndex = 0; runIndex < options.runs; runIndex++) {
      const terminables = new Set()
      const runStartMem = snapshotMemory()
      const runStartedAt = nowMs()

      const createReproducer = createReproducerFactory(
        {
          threadCount: options.threadCount,
          enableCustomState: method === Methods.DES_HyperNEAT,
          verbose: false,
        },
        terminables
      )

      const createEvaluator = (algorithm, environment) => {
        const strategy = new IndividualStrategy()
        const evaluator = createWorkerEvaluator(algorithm, environment, {
          createEnvironmentPathname: '@neat-evolution/dataset-environment',
          createExecutorPathname: '@neat-evolution/executor',
          taskCount: options.taskCount,
          threadCount: options.threadCount,
          strategy,
          verbose: false,
        })
        terminables.add(evaluator)
        return evaluator
      }

      const best = await withMaybeSilencedTrainingLogs(
        options.quietTraining,
        async () => {
        return await demo(createReproducer, createEvaluator, createExecutor, {
          method,
          evolution: {
            iterations: options.iterations,
            secondsLimit: options.secondsLimit,
            ...(Number.isFinite(options.initialMutations)
                ? { initialMutations: options.initialMutations }
                : {}),
            },
          })
        }
      )

      for (const terminable of terminables) {
        if (typeof terminable?.terminate === 'function') {
          await terminable.terminate()
        }
      }

      const runEndMem = snapshotMemory()
      tracker.runs.push({
        run: runIndex + 1,
        method,
        elapsedMs: Number((nowMs() - runStartedAt).toFixed(3)),
        bestFitness: best?.fitness ?? null,
        memoryDeltaMB: {
          rss: Number(
            ((runEndMem.rss - runStartMem.rss) / (1024 * 1024)).toFixed(3)
          ),
          heapUsed: Number(
            (
              (runEndMem.heapUsed - runStartMem.heapUsed) /
              (1024 * 1024)
            ).toFixed(3)
          ),
        },
      })
      console.log(
        `[run ${runIndex + 1}/${options.runs}] elapsed=${tracker.runs[runIndex].elapsedMs}ms rssΔ=${tracker.runs[runIndex].memoryDeltaMB.rss}MB heapΔ=${tracker.runs[runIndex].memoryDeltaMB.heapUsed}MB`
      )
    }
  } finally {
    uninstall()
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    config: {
      method: options.method,
      runs: options.runs,
      iterations: options.iterations,
      initialMutations: options.initialMutations,
      secondsLimit: options.secondsLimit,
      threadCount: options.threadCount,
      taskCount: options.taskCount,
      quietTraining: options.quietTraining,
    },
    runSummaries: tracker.runs,
    phaseMetrics: Object.fromEntries(
      Object.entries(tracker.metrics).map(([key, metric]) => [
        key,
        metricSummary(metric),
      ])
    ),
    payloadMetrics: Object.fromEntries(
      Object.entries(tracker.payloadMetrics).map(([key, metric]) => [
        key,
        payloadMetricSummary(metric),
      ])
    ),
  }

  mkdirSync(dirname(options.output), { recursive: true })
  writeFileSync(options.output, JSON.stringify(summary, null, 2))

  console.log(`\nPipeline experiment summary: ${options.output}`)
}

main().catch((error) => {
  console.error('worker-pipeline-experiment failed:', error)
  process.exit(1)
})
