import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'
import { createExecutor } from '@neat-evolution/executor'
import { resetThreadRNG, setThreadRNGSeed } from '@neat-evolution/utils'
import { createEvaluator as createWorkerEvaluator } from '@neat-evolution/worker-evaluator'
import { createReproducerFactory } from '@neat-evolution/worker-reproducer'
import { hardwareConcurrency } from '@neat-evolution/worker-threads'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultPackageRoot = resolve(__dirname, '..')

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== '--')
  const defaultThreadCount = Math.max(1, Math.min(4, hardwareConcurrency - 1))
  const options = {
    packageRoot: defaultPackageRoot,
    output: '.artifacts/performance-comparison/latest-target.json',
    method: 'ES-HyperNEAT',
    iterations: 200,
    initialMutations: null,
    seed: null,
    secondsLimit: 30,
    earlyStop: true,
    earlyStopPatience: null,
    earlyStopMinThreshold: 0,
    threadCount: defaultThreadCount,
    taskCount: 100,
    memorySampleMs: 250,
    progressLogMs: 15000,
    quietTraining: false,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--package-root' && args[i + 1]) {
      options.packageRoot = resolve(args[++i])
    } else if (arg === '--output' && args[i + 1]) {
      options.output = args[++i]
    } else if (arg === '--method' && args[i + 1]) {
      options.method = args[++i]
    } else if (arg === '--iterations' && args[i + 1]) {
      options.iterations = Number(args[++i])
    } else if (arg === '--initialMutations' && args[i + 1]) {
      options.initialMutations = Number(args[++i])
    } else if (arg === '--seed' && args[i + 1]) {
      options.seed = args[++i]
    } else if (arg === '--secondsLimit' && args[i + 1]) {
      options.secondsLimit = Number(args[++i])
    } else if (arg === '--earlyStop' && args[i + 1]) {
      options.earlyStop = args[++i] !== 'false'
    } else if (arg === '--earlyStopPatience' && args[i + 1]) {
      options.earlyStopPatience = Number(args[++i])
    } else if (arg === '--earlyStopMinThreshold' && args[i + 1]) {
      options.earlyStopMinThreshold = Number(args[++i])
    } else if (arg === '--threadCount' && args[i + 1]) {
      options.threadCount = Number(args[++i])
    } else if (arg === '--taskCount' && args[i + 1]) {
      options.taskCount = Number(args[++i])
    } else if (arg === '--memorySampleMs' && args[i + 1]) {
      options.memorySampleMs = Number(args[++i])
    } else if (arg === '--progress-log-ms' && args[i + 1]) {
      options.progressLogMs = Number(args[++i])
    } else if (arg === '--quiet-training') {
      options.quietTraining = true
    } else if (arg === '--verbose-training') {
      options.quietTraining = false
    } else if (arg === '--verbose') {
      options.verbose = true
    }
  }

  options.packageRoot = resolve(options.packageRoot)
  options.output = resolve(options.packageRoot, options.output)
  options.iterations = Math.max(
    1,
    Number.isFinite(options.iterations) ? Math.floor(options.iterations) : 200
  )
  options.secondsLimit = Math.max(
    1,
    Number.isFinite(options.secondsLimit) ? options.secondsLimit : 30
  )
  options.earlyStopPatience = Math.max(
    0,
    Number.isFinite(options.earlyStopPatience)
      ? Math.floor(options.earlyStopPatience)
      : options.iterations
  )
  options.earlyStopMinThreshold = Number.isFinite(options.earlyStopMinThreshold)
    ? options.earlyStopMinThreshold
    : 0
  options.threadCount = Math.max(
    1,
    Number.isFinite(options.threadCount)
      ? Math.floor(options.threadCount)
      : defaultThreadCount
  )
  options.taskCount = Math.max(
    1,
    Number.isFinite(options.taskCount) ? Math.floor(options.taskCount) : 100
  )
  options.memorySampleMs = Math.max(
    50,
    Number.isFinite(options.memorySampleMs)
      ? Math.floor(options.memorySampleMs)
      : 250
  )
  options.progressLogMs = Math.max(
    1000,
    Number.isFinite(options.progressLogMs)
      ? Math.floor(options.progressLogMs)
      : 15000
  )
  if (!Number.isFinite(options.initialMutations)) {
    options.initialMutations = null
  }
  if (typeof options.seed !== 'string' || options.seed.length === 0) {
    options.seed = null
  }

  return options
}

function logPhase(message) {
  const ts = new Date().toISOString()
  console.log(`[perf-compare-target ${ts}] ${message}`)
}

function toMB(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(3))
}

function createMemorySnapshot() {
  const usage = process.memoryUsage()
  return {
    ts: Date.now(),
    rss: usage.rss,
    heapTotal: usage.heapTotal,
    heapUsed: usage.heapUsed,
    external: usage.external,
    arrayBuffers: usage.arrayBuffers,
  }
}

function summarizeMemory(samples) {
  const first = samples[0]
  const last = samples[samples.length - 1]
  const peak = { ...first }
  const floor = { ...first }

  for (const sample of samples) {
    peak.rss = Math.max(peak.rss, sample.rss)
    peak.heapTotal = Math.max(peak.heapTotal, sample.heapTotal)
    peak.heapUsed = Math.max(peak.heapUsed, sample.heapUsed)
    peak.external = Math.max(peak.external, sample.external)
    peak.arrayBuffers = Math.max(peak.arrayBuffers, sample.arrayBuffers)

    floor.rss = Math.min(floor.rss, sample.rss)
    floor.heapTotal = Math.min(floor.heapTotal, sample.heapTotal)
    floor.heapUsed = Math.min(floor.heapUsed, sample.heapUsed)
    floor.external = Math.min(floor.external, sample.external)
    floor.arrayBuffers = Math.min(floor.arrayBuffers, sample.arrayBuffers)
  }

  return {
    sampleCount: samples.length,
    first,
    last,
    peak,
    floor,
    delta: {
      rss: last.rss - first.rss,
      heapTotal: last.heapTotal - first.heapTotal,
      heapUsed: last.heapUsed - first.heapUsed,
      external: last.external - first.external,
      arrayBuffers: last.arrayBuffers - first.arrayBuffers,
    },
  }
}

function withMaybeSilencedTrainingLogs(quietTraining, fn) {
  if (!quietTraining) return fn()

  const originalLog = console.log
  const originalInfo = console.info
  const originalDebug = console.debug
  const originalWarn = console.warn
  console.log = () => {}
  console.info = () => {}
  console.debug = () => {}
  console.warn = () => {}
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      console.log = originalLog
      console.info = originalInfo
      console.debug = originalDebug
      console.warn = originalWarn
    })
}

async function run() {
  const options = parseArgs(process.argv.slice(2))
  const demoModuleUrl = pathToFileURL(
    resolve(options.packageRoot, 'dist/esm/demo.js')
  ).href
  const { demo, Methods } = await import(demoModuleUrl)

  mkdirSync(dirname(options.output), { recursive: true })

  const method = Object.values(Methods).includes(options.method)
    ? options.method
    : Methods.ES_HyperNEAT
  if (options.seed != null) {
    setThreadRNGSeed(options.seed)
  } else {
    resetThreadRNG()
  }
  const terminables = new Set()
  const createReproducer = createReproducerFactory(
    {
      threadCount: options.threadCount,
      randomSeed: options.seed ?? undefined,
      enableCustomState: method === Methods.DES_HyperNEAT,
      verbose: options.verbose,
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
      verbose: options.verbose,
    })
    terminables.add(evaluator)
    return evaluator
  }

  const memorySamples = [createMemorySnapshot()]
  const interval = setInterval(() => {
    memorySamples.push(createMemorySnapshot())
  }, options.memorySampleMs)
  interval.unref?.()

  const cpuBefore = process.cpuUsage()
  const startedAt = Date.now()
  const startedHr = process.hrtime.bigint()
  let best = null
  let error = null
  const progressTimer = setInterval(() => {
    const elapsedMs = Date.now() - startedAt
    logPhase(`training still running elapsedMs=${elapsedMs}`)
  }, options.progressLogMs)
  progressTimer.unref?.()

  try {
    best = await withMaybeSilencedTrainingLogs(options.quietTraining, () =>
      demo(createReproducer, createEvaluator, createExecutor, {
        method,
        evolution: {
          iterations: options.iterations,
          secondsLimit: options.secondsLimit,
          earlyStop: options.earlyStop,
          earlyStopPatience: options.earlyStopPatience,
          earlyStopMinThreshold: options.earlyStopMinThreshold,
          ...(Number.isFinite(options.initialMutations)
            ? { initialMutations: options.initialMutations }
            : {}),
        },
      })
    )
  } catch (cause) {
    error = {
      message: cause instanceof Error ? cause.message : String(cause),
      stack: cause instanceof Error ? cause.stack : undefined,
    }
  } finally {
    clearInterval(progressTimer)
    clearInterval(interval)
    memorySamples.push(createMemorySnapshot())
  }

  for (const terminable of terminables) {
    if (typeof terminable?.terminate !== 'function') continue
    try {
      await terminable.terminate()
    } catch {}
  }

  const endedAt = Date.now()
  const elapsedMs = Number(process.hrtime.bigint() - startedHr) / 1_000_000
  const cpu = process.cpuUsage(cpuBefore)
  const memory = summarizeMemory(memorySamples)
  const result = {
    ok: error == null,
    packageRoot: options.packageRoot,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    metrics: {
      elapsedMs: Number(elapsedMs.toFixed(3)),
      cpuUserMs: Number((cpu.user / 1000).toFixed(3)),
      cpuSystemMs: Number((cpu.system / 1000).toFixed(3)),
      cpuTotalMs: Number(((cpu.user + cpu.system) / 1000).toFixed(3)),
      cpuToWallRatio: Number(
        ((cpu.user + cpu.system) / 1000 / Math.max(elapsedMs, 1)).toFixed(3)
      ),
    },
    memory: {
      sampleCount: memory.sampleCount,
      first: {
        rssMB: toMB(memory.first.rss),
        heapTotalMB: toMB(memory.first.heapTotal),
        heapUsedMB: toMB(memory.first.heapUsed),
        externalMB: toMB(memory.first.external),
      },
      last: {
        rssMB: toMB(memory.last.rss),
        heapTotalMB: toMB(memory.last.heapTotal),
        heapUsedMB: toMB(memory.last.heapUsed),
        externalMB: toMB(memory.last.external),
      },
      peak: {
        rssMB: toMB(memory.peak.rss),
        heapTotalMB: toMB(memory.peak.heapTotal),
        heapUsedMB: toMB(memory.peak.heapUsed),
        externalMB: toMB(memory.peak.external),
      },
      delta: {
        rssMB: toMB(memory.delta.rss),
        heapTotalMB: toMB(memory.delta.heapTotal),
        heapUsedMB: toMB(memory.delta.heapUsed),
        externalMB: toMB(memory.delta.external),
      },
    },
    config: {
      method,
      ...(options.seed != null ? { seed: options.seed } : {}),
      iterations: options.iterations,
      secondsLimit: options.secondsLimit,
      earlyStop: options.earlyStop,
      earlyStopPatience: options.earlyStopPatience,
      earlyStopMinThreshold: options.earlyStopMinThreshold,
      threadCount: options.threadCount,
      taskCount: options.taskCount,
      memorySampleMs: options.memorySampleMs,
      ...(Number.isFinite(options.initialMutations)
        ? { initialMutations: options.initialMutations }
        : {}),
    },
    bestFitness: best?.fitness ?? null,
    error,
  }

  writeFileSync(options.output, JSON.stringify(result, null, 2))
  if (error) {
    throw new Error(error.message)
  }
}

run().catch((error) => {
  console.error('Performance compare target failed:', error)
  process.exit(1)
})
