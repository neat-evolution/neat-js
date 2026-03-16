import { mkdirSync, writeFileSync } from 'node:fs'
import inspector from 'node:inspector'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { IndividualStrategy } from '@neat-evolution/evaluation-strategy'
import { createExecutor } from '@neat-evolution/executor'
import { createEvaluator as createWorkerEvaluator } from '@neat-evolution/worker-evaluator'
import { createReproducerFactory } from '@neat-evolution/worker-reproducer'
import { hardwareConcurrency } from '@neat-evolution/worker-threads'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== '--')
  const defaultThreadCount = Math.max(1, Math.min(4, hardwareConcurrency - 1))
  const options = {
    profileOutput: '.artifacts/cpuprofiles/latest.cpuprofile',
    memorySummaryOutput: '.artifacts/cpuprofiles/latest.memory.json',
    method: 'ES-HyperNEAT',
    iterations: 10,
    initialMutations: null,
    secondsLimit: 20,
    threadCount: defaultThreadCount,
    taskCount: 100,
    memorySampleMs: 1000,
    shutdownTimeoutMs: 15000,
    progressLogMs: 30000,
    evolveLogTimeIntervalMs: 15000,
    quietTraining: false,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--profileOutput' && args[i + 1]) {
      options.profileOutput = args[++i]
    } else if (arg === '--memorySummaryOutput' && args[i + 1]) {
      options.memorySummaryOutput = args[++i]
    } else if (arg === '--method' && args[i + 1]) {
      options.method = args[++i]
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
    } else if (arg === '--memorySampleMs' && args[i + 1]) {
      options.memorySampleMs = Number(args[++i])
    } else if (arg === '--shutdown-timeout-ms' && args[i + 1]) {
      options.shutdownTimeoutMs = Number(args[++i])
    } else if (arg === '--progress-log-ms' && args[i + 1]) {
      options.progressLogMs = Number(args[++i])
    } else if (arg === '--evolve-log-time-interval-ms' && args[i + 1]) {
      options.evolveLogTimeIntervalMs = Number(args[++i])
    } else if (arg === '--quiet-training') {
      options.quietTraining = true
    } else if (arg === '--verbose-training') {
      options.quietTraining = false
    } else if (arg === '--verbose') {
      options.verbose = true
    }
  }

  options.profileOutput = resolve(packageRoot, options.profileOutput)
  options.memorySummaryOutput = resolve(
    packageRoot,
    options.memorySummaryOutput
  )
  options.iterations = Math.max(
    1,
    Number.isFinite(options.iterations) ? options.iterations : 10
  )
  if (Number.isFinite(options.initialMutations)) {
    options.initialMutations = Math.max(0, options.initialMutations)
  } else {
    options.initialMutations = null
  }
  options.secondsLimit = Math.max(
    1,
    Number.isFinite(options.secondsLimit) ? options.secondsLimit : 20
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
  options.memorySampleMs = Math.max(
    100,
    Number.isFinite(options.memorySampleMs) ? options.memorySampleMs : 1000
  )
  options.shutdownTimeoutMs = Math.max(
    1000,
    Number.isFinite(options.shutdownTimeoutMs)
      ? options.shutdownTimeoutMs
      : 15000
  )
  options.progressLogMs = Math.max(
    1000,
    Number.isFinite(options.progressLogMs) ? options.progressLogMs : 30000
  )
  options.evolveLogTimeIntervalMs = Math.max(
    0,
    Number.isFinite(options.evolveLogTimeIntervalMs)
      ? options.evolveLogTimeIntervalMs
      : 15000
  )

  return options
}

function withTimeout(promise, timeoutMs, label) {
  let timer = null
  const timeoutPromise = new Promise((_, rejectPromise) => {
    timer = setTimeout(() => {
      rejectPromise(new Error(`Timed out after ${timeoutMs}ms: ${label}`))
    }, timeoutMs)
    timer.unref?.()
  })
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer)
    }),
    timeoutPromise,
  ])
}

function postAsync(session, method, params = undefined) {
  return new Promise((resolvePromise, rejectPromise) => {
    session.post(method, params, (error, result) => {
      if (error) {
        rejectPromise(error)
        return
      }
      resolvePromise(result)
    })
  })
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

function logPhase(message) {
  const ts = new Date().toISOString()
  console.log(`[profile-target ${ts}] ${message}`)
}

function summarizeMemory(samples) {
  if (samples.length === 0) {
    const current = createMemorySnapshot()
    return {
      first: current,
      last: current,
      min: current,
      max: current,
      delta: {
        rss: 0,
        heapTotal: 0,
        heapUsed: 0,
        external: 0,
        arrayBuffers: 0,
      },
      sampleCount: 1,
    }
  }

  const first = samples[0]
  const last = samples[samples.length - 1]
  const min = { ...samples[0] }
  const max = { ...samples[0] }

  for (const sample of samples) {
    min.rss = Math.min(min.rss, sample.rss)
    min.heapTotal = Math.min(min.heapTotal, sample.heapTotal)
    min.heapUsed = Math.min(min.heapUsed, sample.heapUsed)
    min.external = Math.min(min.external, sample.external)
    min.arrayBuffers = Math.min(min.arrayBuffers, sample.arrayBuffers)

    max.rss = Math.max(max.rss, sample.rss)
    max.heapTotal = Math.max(max.heapTotal, sample.heapTotal)
    max.heapUsed = Math.max(max.heapUsed, sample.heapUsed)
    max.external = Math.max(max.external, sample.external)
    max.arrayBuffers = Math.max(max.arrayBuffers, sample.arrayBuffers)
  }

  return {
    first,
    last,
    min,
    max,
    delta: {
      rss: last.rss - first.rss,
      heapTotal: last.heapTotal - first.heapTotal,
      heapUsed: last.heapUsed - first.heapUsed,
      external: last.external - first.external,
      arrayBuffers: last.arrayBuffers - first.arrayBuffers,
    },
    sampleCount: samples.length,
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

async function run() {
  const options = parseArgs(process.argv.slice(2))
  logPhase('loading demo module')
  const { demo, Methods } = await import('../dist/esm/demo.js')
  logPhase('demo module loaded')

  mkdirSync(dirname(options.profileOutput), { recursive: true })
  mkdirSync(dirname(options.memorySummaryOutput), { recursive: true })

  const threadCount = options.threadCount
  const taskCount = options.taskCount
  const terminables = new Set()
  const method = Object.values(Methods).includes(options.method)
    ? options.method
    : Methods.ES_HyperNEAT

  const createReproducer = createReproducerFactory(
    {
      threadCount,
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
      taskCount,
      threadCount,
      strategy,
      verbose: options.verbose,
    })
    terminables.add(evaluator)
    return evaluator
  }

  const memorySamples = [createMemorySnapshot()]
  const memoryInterval = setInterval(() => {
    memorySamples.push(createMemorySnapshot())
  }, options.memorySampleMs)
  memoryInterval.unref()

  const session = new inspector.Session()
  session.connect()
  logPhase('inspector connected')
  await postAsync(session, 'Profiler.enable')
  logPhase('profiler enabled')

  logPhase('starting worker profile target run')
  console.log(
    `method=${method} iterations=${options.iterations} initialMutations=${
      options.initialMutations ?? '(default)'
    } secondsLimit=${options.secondsLimit} threadCount=${threadCount} taskCount=${taskCount}`
  )

  const startedAt = Date.now()
  await postAsync(session, 'Profiler.start')
  logPhase('profiler started')
  const progressTimer = setInterval(() => {
    const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000)
    logPhase(`training still running elapsed=${elapsedSeconds}s`)
  }, options.progressLogMs)
  progressTimer.unref()

  let best = null
  try {
    logPhase('training phase begin')
    best = await withMaybeSilencedTrainingLogs(
      options.quietTraining,
      async () => {
        return await demo(createReproducer, createEvaluator, createExecutor, {
          method,
          evolutionOptions: {
            iterations: options.iterations,
            secondsLimit: options.secondsLimit,
            logTimeIntervalMs: options.evolveLogTimeIntervalMs,
            ...(Number.isFinite(options.initialMutations)
              ? { initialMutations: options.initialMutations }
              : {}),
          },
        })
      }
    )
    logPhase('training phase complete')
  } finally {
    logPhase('stopping profiler')
    clearInterval(progressTimer)
    const stopped = await postAsync(session, 'Profiler.stop')
    logPhase('profiler stopped')
    session.disconnect()
    logPhase('inspector disconnected')
    writeFileSync(options.profileOutput, JSON.stringify(stopped.profile))
    logPhase(`profile written ${options.profileOutput}`)
    clearInterval(memoryInterval)
    memorySamples.push(createMemorySnapshot())

    const endedAt = Date.now()
    const memory = summarizeMemory(memorySamples)
    writeFileSync(
      options.memorySummaryOutput,
      JSON.stringify(
        {
          startedAt,
          endedAt,
          durationMs: endedAt - startedAt,
          config: {
            method,
            iterations: options.iterations,
            secondsLimit: options.secondsLimit,
            threadCount,
            taskCount,
            memorySampleMs: options.memorySampleMs,
            ...(Number.isFinite(options.initialMutations)
              ? { initialMutations: options.initialMutations }
              : {}),
          },
          memory,
          samples: memorySamples,
        },
        null,
        2
      )
    )
    logPhase(`memory summary written ${options.memorySummaryOutput}`)
  }

  if (terminables.size > 0) {
    logPhase(`shutting down ${terminables.size} terminables`)
  }
  let terminableIndex = 0
  for (const terminable of terminables) {
    terminableIndex += 1
    if (typeof terminable?.terminate !== 'function') continue
    try {
      logPhase(
        `terminable ${terminableIndex}/${terminables.size} terminate begin`
      )
      await withTimeout(
        Promise.resolve(terminable.terminate()),
        options.shutdownTimeoutMs,
        `terminable[${terminableIndex}].terminate()`
      )
      logPhase(
        `terminable ${terminableIndex}/${terminables.size} terminate done`
      )
    } catch (error) {
      console.warn(
        `Terminate timed out/skipped for terminable ${terminableIndex}/${terminables.size}:`,
        error
      )
    }
  }

  logPhase(
    `run complete profile=${options.profileOutput} memory=${options.memorySummaryOutput}`
  )
  if (best) {
    logPhase(`best fitness ${best.fitness}`)
  }
}

run().catch((error) => {
  console.error('Profile target failed:', error)
  process.exit(1)
})
