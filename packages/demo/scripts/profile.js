import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const distDir = resolve(rootDir, 'dist/esm')
const demoJs = join(distDir, 'demo.js')

const PERF_MATCH_KEYS = [
  'method',
  'iterations',
  'initialMutations',
  'secondsLimit',
  'threadCount',
  'taskCount',
  'memorySampleMs',
]

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== '--')
  const options = {
    outputDir: '.artifacts/cpuprofiles',
    name: `demo-es-hyperneat-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    nameProvided: false,
    runs: 5,
    baseline: null,
    targetTimeoutMs: null,
    analyzeTimeoutMs: null,
    trainArgs: [],
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--output-dir' && args[i + 1]) {
      options.outputDir = args[++i]
      continue
    }
    if (arg === '--name' && args[i + 1]) {
      options.name = args[++i]
      options.nameProvided = true
      continue
    }
    if (arg === '--runs' && args[i + 1]) {
      const parsed = Number(args[++i])
      options.runs = Number.isFinite(parsed)
        ? Math.max(1, Math.floor(parsed))
        : 5
      continue
    }
    if (arg === '--baseline' && args[i + 1]) {
      options.baseline = args[++i]
      continue
    }
    if (arg === '--target-timeout-ms' && args[i + 1]) {
      const parsed = Number(args[++i])
      options.targetTimeoutMs = Number.isFinite(parsed)
        ? Math.max(0, Math.floor(parsed))
        : null
      continue
    }
    if (arg === '--analyze-timeout-ms' && args[i + 1]) {
      const parsed = Number(args[++i])
      options.analyzeTimeoutMs = Number.isFinite(parsed)
        ? Math.max(0, Math.floor(parsed))
        : null
      continue
    }
    options.trainArgs.push(arg)
  }

  const hasTrainingLogModeArg = options.trainArgs.some(
    (arg) => arg === '--quiet-training' || arg === '--verbose-training'
  )
  if (!hasTrainingLogModeArg) {
    options.trainArgs.push('--quiet-training')
  }

  return options
}

function normalizeMethodName(rawMethod) {
  if (typeof rawMethod !== 'string' || rawMethod.length === 0) {
    return 'es-hyperneat'
  }
  return rawMethod
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
}

function parseTrainArgString(trainArgs, name) {
  for (let i = 0; i < trainArgs.length; i++) {
    if (trainArgs[i] !== name) continue
    const raw = trainArgs[i + 1]
    if (typeof raw === 'string' && raw.length > 0) return raw
  }
  return null
}

async function run(
  command,
  args,
  cwd = rootDir,
  env = process.env,
  capture = false,
  timeoutMs = 0
) {
  const result = await execa(command, args, {
    cwd,
    stdio: capture ? 'pipe' : 'inherit',
    all: false,
    env,
    timeout: timeoutMs > 0 ? timeoutMs : undefined,
    reject: false,
  })

  if (result.failed || result.exitCode !== 0) {
    if (result.timedOut) {
      console.error(
        `Command timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`
      )
    }
    if (capture) {
      if (result.stdout) process.stdout.write(`${result.stdout}\n`)
      if (result.stderr) process.stderr.write(`${result.stderr}\n`)
    }
    const code = result.exitCode ?? 1
    const error = new Error(
      `Command failed (exit ${code}): ${command} ${args.join(' ')}`
    )
    error.timedOut = Boolean(result.timedOut)
    error.exitCode = code
    throw error
  }

  return result
}

async function waitWithHeartbeat(label, phase, promise, heartbeatMs = 15000) {
  const startedAt = Date.now()
  const timer = setInterval(() => {
    const elapsedSec = (Date.now() - startedAt) / 1000
    console.log(`${label}${phase} still running... elapsed=${fmt(elapsedSec)}s`)
  }, heartbeatMs)
  timer.unref?.()

  try {
    return await promise
  } finally {
    clearInterval(timer)
  }
}

async function ensureBuild() {
  if (existsSync(demoJs)) {
    return
  }
  console.log('Build missing, running build...')
  await run('yarn', ['build'])
}

async function ensureDataset() {
  await run(process.execPath, [resolve(rootDir, 'scripts/iris.js')])
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'))
}

function getNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return null
  if (sortedValues.length === 1) return sortedValues[0]
  const clamped = Math.max(0, Math.min(1, p))
  const index = clamped * (sortedValues.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  if (lower === upper) return sortedValues[lower]
  const weight = index - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

function medianOf(values) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function detectOutlierIndexes(values) {
  if (values.length < 5) return []
  const med = medianOf(values)
  if (!Number.isFinite(med)) return []
  const deviations = values.map((v) => Math.abs(v - med))
  const mad = medianOf(deviations)
  if (!Number.isFinite(mad) || mad === 0) return []

  const outliers = []
  for (let i = 0; i < values.length; i++) {
    const modifiedZ = (0.6745 * (values[i] - med)) / mad
    if (Math.abs(modifiedZ) > 3.5) {
      outliers.push(i)
    }
  }
  return outliers
}

function stats(values) {
  if (values.length === 0) return null
  const sum = values.reduce((acc, value) => acc + value, 0)
  const mean = sum / values.length
  const sorted = [...values].sort((a, b) => a - b)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const variance =
    values.reduce((acc, value) => {
      const delta = value - mean
      return acc + delta * delta
    }, 0) / values.length
  let trimmedMean = mean
  if (sorted.length >= 5) {
    const trimmed = sorted.slice(1, -1)
    trimmedMean =
      trimmed.reduce((acc, value) => acc + value, 0) /
      Math.max(trimmed.length, 1)
  }
  const stddev = Math.sqrt(variance)
  const cv = mean !== 0 ? stddev / Math.abs(mean) : 0
  return {
    mean,
    median: medianOf(values),
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    trimmedMean,
    min,
    max,
    stddev,
    cv,
    outlierIndexes: detectOutlierIndexes(values),
  }
}

function fmt(value) {
  if (!Number.isFinite(value)) return 'n/a'
  return Number(value.toFixed(2))
}

function parseTrainArgNumber(trainArgs, name, fallback) {
  for (let i = 0; i < trainArgs.length; i++) {
    if (trainArgs[i] !== name) continue
    const raw = trainArgs[i + 1]
    const parsed = Number(raw)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function selectDeltaValue(metric) {
  if (!metric) return 0
  // If variance is high, use trimmed mean as the comparison basis.
  if ((metric.cv ?? 0) > 0.15 && Number.isFinite(metric.trimmedMean)) {
    return metric.trimmedMean
  }
  return Number.isFinite(metric.mean) ? metric.mean : 0
}

function extractRunConfig(summary) {
  if (summary?.runConfig && typeof summary.runConfig === 'object')
    return summary.runConfig
  if (
    summary?.memorySummary?.config &&
    typeof summary.memorySummary.config === 'object'
  ) {
    return summary.memorySummary.config
  }
  return null
}

function matchesConfigOnKeys(candidateConfig, currentConfig, keys) {
  if (candidateConfig == null || currentConfig == null) return false
  for (const key of keys) {
    const candidateValue = candidateConfig[key]
    const currentValue = currentConfig[key]
    if (candidateValue == null && currentValue == null) continue
    if (candidateValue == null || currentValue == null) return false
    if (candidateValue !== currentValue) return false
  }
  return true
}

function loadPreviousAggregateSummary(
  profileDir,
  currentRunDir,
  runConfig,
  runCount
) {
  if (!existsSync(profileDir)) return null

  const currentDirName =
    dirname(currentRunDir) === profileDir ? currentRunDir.split('/').pop() : ''
  const candidates = readdirSync(profileDir)
    .filter((name) => name !== currentDirName)
    .map((name) => join(profileDir, name, 'summary.json'))
    .filter((pathname) => existsSync(pathname))
    .sort()
    .reverse()

  for (const pathname of candidates) {
    const summary = readJson(pathname)
    if (summary?.aggregate?.kind !== 'multi-run') continue
    if (summary.aggregate?.runCount !== runCount) continue
    const previousConfig = extractRunConfig(summary)
    if (!matchesConfigOnKeys(previousConfig, runConfig, PERF_MATCH_KEYS))
      continue
    return { path: pathname, summary }
  }
  return null
}

function _loadPreviousAggregateSummaries(
  profileDir,
  currentRunDir,
  runConfig,
  runCount,
  limit
) {
  if (!existsSync(profileDir)) return []
  const currentDirName =
    dirname(currentRunDir) === profileDir ? currentRunDir.split('/').pop() : ''
  const candidates = readdirSync(profileDir)
    .filter((name) => name !== currentDirName)
    .map((name) => join(profileDir, name, 'summary.json'))
    .filter((pathname) => existsSync(pathname))
    .sort()
    .reverse()

  const matches = []
  for (const pathname of candidates) {
    const summary = readJson(pathname)
    if (summary?.aggregate?.kind !== 'multi-run') continue
    if (summary.aggregate?.runCount !== runCount) continue
    const previousConfig = extractRunConfig(summary)
    if (!matchesConfigOnKeys(previousConfig, runConfig, PERF_MATCH_KEYS))
      continue
    matches.push({ path: pathname, summary })
    if (matches.length >= limit) break
  }
  return matches
}

function loadNamedBaselineSummary(
  profileDir,
  baselineName,
  runConfig,
  runCount
) {
  if (!baselineName) return null
  const normalized = baselineName.endsWith('/summary.json')
    ? baselineName
    : join(baselineName, 'summary.json')
  const pathname = join(profileDir, normalized)
  if (!existsSync(pathname)) {
    return {
      reason: `baseline_not_found: ${baselineName}`,
      requested: baselineName,
      path: pathname,
      summary: null,
    }
  }

  const summary = readJson(pathname)
  if (summary?.aggregate?.kind !== 'multi-run') {
    return {
      reason: 'baseline_not_multi_run_summary',
      requested: baselineName,
      path: pathname,
      summary: null,
    }
  }
  if (summary.aggregate?.runCount !== runCount) {
    return {
      reason: `baseline_run_count_mismatch (expected ${runCount}, got ${summary.aggregate?.runCount ?? 'n/a'})`,
      requested: baselineName,
      path: pathname,
      summary: null,
    }
  }
  const previousConfig = extractRunConfig(summary)
  if (!matchesConfigOnKeys(previousConfig, runConfig, PERF_MATCH_KEYS)) {
    return {
      reason: `baseline_run_config_mismatch (match keys: ${PERF_MATCH_KEYS.join(', ')})`,
      requested: baselineName,
      path: pathname,
      summary: null,
    }
  }

  return {
    path: pathname,
    summary,
    requested: baselineName,
    reason: null,
  }
}

function aggregateRuns(runSummaries, runDir, runCount) {
  const mainCpuMs = runSummaries.map((summary) => getNumber(summary.totalMs))
  const workerCpuMs = runSummaries.map((summary) =>
    getNumber(summary.workerCpuSummary?.totalMs)
  )
  const rssDeltaMB = runSummaries.map((summary) =>
    getNumber(summary.memorySummary?.delta?.rssMB)
  )
  const heapUsedDeltaMB = runSummaries.map((summary) =>
    getNumber(summary.memorySummary?.delta?.heapUsedMB)
  )

  const branchMap = new Map()
  for (const summary of runSummaries) {
    const branches = summary.bottleneckBranches?.branches ?? []
    for (const branch of branches) {
      const key = `${branch.function}||${branch.branch}`
      const current = branchMap.get(key) || {
        function: branch.function,
        branch: branch.branch,
        samples: 0,
        selfMs: [],
        selfPctOfProfile: [],
        exclusivePct: [],
      }
      current.samples += 1
      current.selfMs.push(getNumber(branch.selfMs))
      current.selfPctOfProfile.push(getNumber(branch.selfPctOfProfile))
      current.exclusivePct.push(getNumber(branch.exclusivePct))
      branchMap.set(key, current)
    }
  }

  const bottleneckBranches = [...branchMap.values()]
    .map((entry) => ({
      function: entry.function,
      branch: entry.branch,
      samples: entry.samples,
      selfMsMean: stats(entry.selfMs)?.mean ?? 0,
      selfPctMean: stats(entry.selfPctOfProfile)?.mean ?? 0,
      exclusivePctMean: stats(entry.exclusivePct)?.mean ?? 0,
    }))
    .sort((a, b) => b.selfMsMean - a.selfMsMean)
  const functionMap = new Map()
  for (const branch of bottleneckBranches) {
    const current = functionMap.get(branch.function) || {
      function: branch.function,
      selfMsTotal: 0,
      selfPctTotal: 0,
      exclusivePctTotal: 0,
      branchSamples: 0,
      contexts: [],
    }
    current.selfMsTotal += branch.selfMsMean
    current.selfPctTotal += branch.selfPctMean
    current.exclusivePctTotal += branch.exclusivePctMean
    current.branchSamples += branch.samples
    current.contexts.push({
      branch: branch.branch,
      selfMsMean: branch.selfMsMean,
      samples: branch.samples,
    })
    functionMap.set(branch.function, current)
  }

  const bottleneckFunctions = [...functionMap.values()]
    .map((entry) => {
      const sortedContexts = entry.contexts.sort(
        (a, b) => b.selfMsMean - a.selfMsMean
      )
      return {
        function: entry.function,
        selfMsTotal: entry.selfMsTotal,
        selfPctTotal: entry.selfPctTotal,
        exclusivePctTotal: entry.exclusivePctTotal,
        branchSamples: entry.branchSamples,
        contextCount: sortedContexts.length,
        contexts: sortedContexts,
      }
    })
    .sort((a, b) => b.selfMsTotal - a.selfMsTotal)
    .slice(0, 30)

  const runConfig = extractRunConfig(runSummaries[0] ?? null)
  const aggregateSummary = {
    profilePath: join(runDir, 'profile.cpuprofile'),
    runConfig,
    aggregate: {
      kind: 'multi-run',
      runCount,
      generatedAt: new Date().toISOString(),
      runDirs: runSummaries.map((summary) => dirname(summary.profilePath)),
    },
    metrics: {
      mainCpuMs: stats(mainCpuMs),
      workerCpuMs: stats(workerCpuMs),
      memoryDeltaRssMB: stats(rssDeltaMB),
      memoryDeltaHeapUsedMB: stats(heapUsedDeltaMB),
    },
    bottleneckBranches: {
      basedOn: runSummaries[0]?.bottleneckBranches?.basedOn ?? 'worker',
      branches: bottleneckBranches,
    },
    bottleneckFunctions: {
      basedOn: runSummaries[0]?.bottleneckBranches?.basedOn ?? 'worker',
      functions: bottleneckFunctions,
    },
    runs: runSummaries.map((summary) => ({
      profilePath: summary.profilePath,
      summaryPath: summary.summaryPath,
      mainCpuMs: getNumber(summary.totalMs),
      workerCpuMs: getNumber(summary.workerCpuSummary?.totalMs),
      memoryDeltaRssMB: getNumber(summary.memorySummary?.delta?.rssMB),
      memoryDeltaHeapUsedMB: getNumber(
        summary.memorySummary?.delta?.heapUsedMB
      ),
    })),
  }

  return aggregateSummary
}

function printAggregateReport(
  aggregateSummary,
  previous,
  baselineRequest = null
) {
  const metrics = aggregateSummary.metrics
  console.log(
    `Averaged across ${aggregateSummary.aggregate.runCount} runs (matching config required for baseline deltas).`
  )
  console.table([
    {
      Metric: 'Main CPU ms',
      Mean: fmt(metrics.mainCpuMs?.mean),
      Median: fmt(metrics.mainCpuMs?.median),
      'Trimmed mean': fmt(metrics.mainCpuMs?.trimmedMean),
      StdDev: fmt(metrics.mainCpuMs?.stddev),
      'CV %': fmt((metrics.mainCpuMs?.cv ?? 0) * 100),
      Min: fmt(metrics.mainCpuMs?.min),
      Max: fmt(metrics.mainCpuMs?.max),
    },
    {
      Metric: 'Worker CPU ms',
      Mean: fmt(metrics.workerCpuMs?.mean),
      Median: fmt(metrics.workerCpuMs?.median),
      'Trimmed mean': fmt(metrics.workerCpuMs?.trimmedMean),
      StdDev: fmt(metrics.workerCpuMs?.stddev),
      'CV %': fmt((metrics.workerCpuMs?.cv ?? 0) * 100),
      Min: fmt(metrics.workerCpuMs?.min),
      Max: fmt(metrics.workerCpuMs?.max),
    },
    {
      Metric: 'Memory delta RSS MB',
      Mean: fmt(metrics.memoryDeltaRssMB?.mean),
      Median: fmt(metrics.memoryDeltaRssMB?.median),
      'Trimmed mean': fmt(metrics.memoryDeltaRssMB?.trimmedMean),
      StdDev: fmt(metrics.memoryDeltaRssMB?.stddev),
      'CV %': fmt((metrics.memoryDeltaRssMB?.cv ?? 0) * 100),
      Min: fmt(metrics.memoryDeltaRssMB?.min),
      Max: fmt(metrics.memoryDeltaRssMB?.max),
    },
    {
      Metric: 'Memory delta HeapUsed MB',
      Mean: fmt(metrics.memoryDeltaHeapUsedMB?.mean),
      Median: fmt(metrics.memoryDeltaHeapUsedMB?.median),
      'Trimmed mean': fmt(metrics.memoryDeltaHeapUsedMB?.trimmedMean),
      StdDev: fmt(metrics.memoryDeltaHeapUsedMB?.stddev),
      'CV %': fmt((metrics.memoryDeltaHeapUsedMB?.cv ?? 0) * 100),
      Min: fmt(metrics.memoryDeltaHeapUsedMB?.min),
      Max: fmt(metrics.memoryDeltaHeapUsedMB?.max),
    },
  ])

  const stabilityRows = [
    ['Main CPU ms', metrics.mainCpuMs],
    ['Worker CPU ms', metrics.workerCpuMs],
    ['RSS delta MB', metrics.memoryDeltaRssMB],
    ['HeapUsed delta MB', metrics.memoryDeltaHeapUsedMB],
  ]
    .filter(([, metric]) => metric != null)
    .map(([metricName, metric]) => ({
      Metric: metricName,
      Stable: (metric.cv ?? 0) <= 0.15 ? 'yes' : 'no',
      'CV %': fmt((metric.cv ?? 0) * 100),
      Outliers:
        metric.outlierIndexes && metric.outlierIndexes.length > 0
          ? metric.outlierIndexes.map((index) => index + 1).join(', ')
          : 'none',
    }))
  console.log('Stability check (CV <= 15% target):')
  console.table(stabilityRows)

  const functions =
    aggregateSummary.bottleneckFunctions?.functions ??
    aggregateSummary.bottleneckBranches.branches.slice(0, 30).map((branch) => ({
      function: branch.function,
      selfMsTotal: branch.selfMsMean,
      selfPctTotal: branch.selfPctMean,
      exclusivePctTotal: branch.exclusivePctMean,
      branchSamples: branch.samples,
      contextCount: 1,
      contexts: [
        {
          branch: branch.branch,
          selfMsMean: branch.selfMsMean,
          samples: branch.samples,
        },
      ],
    }))

  function formatContextPreview(contexts) {
    if (!Array.isArray(contexts) || contexts.length === 0) return 'n/a'
    const first = contexts[0].branch
    if (contexts.length === 1) return first
    return `${first} and ${contexts.length - 1} others`
  }

  console.log(
    `Top bottleneck functions (${aggregateSummary.bottleneckBranches.basedOn}, averaged, showing ${functions.length}/${aggregateSummary.bottleneckFunctions?.functions?.length ?? functions.length}):`
  )
  console.table(
    functions.map((row, index) => ({
      '#': index + 1,
      Function: row.function,
      'Self ms (total mean)': fmt(row.selfMsTotal),
      'Self % (total mean)': fmt(row.selfPctTotal * 100),
      'Exclusive % (total mean)': fmt(row.exclusivePctTotal * 100),
      Contexts: row.contextCount,
      Samples: row.branchSamples,
      'Top Contexts': formatContextPreview(row.contexts),
    }))
  )

  if (!previous) {
    if (baselineRequest) {
      console.log(
        `Baseline comparison unavailable: ${baselineRequest.reason ?? 'baseline_invalid'}`
      )
      return
    }
    console.log(
      `Baseline comparison unavailable: no_previous_matching_summary_params (match keys: ${PERF_MATCH_KEYS.join(', ')}, runCount)`
    )
    return
  }

  const prevMetrics = previous.summary.metrics
  const currMetrics = aggregateSummary.metrics
  const prevMainValue = selectDeltaValue(prevMetrics.mainCpuMs)
  const currMainValue = selectDeltaValue(currMetrics.mainCpuMs)
  const prevWorkerValue = selectDeltaValue(prevMetrics.workerCpuMs)
  const currWorkerValue = selectDeltaValue(currMetrics.workerCpuMs)
  const prevRssValue = selectDeltaValue(prevMetrics.memoryDeltaRssMB)
  const currRssValue = selectDeltaValue(currMetrics.memoryDeltaRssMB)
  const prevHeapValue = selectDeltaValue(prevMetrics.memoryDeltaHeapUsedMB)
  const currHeapValue = selectDeltaValue(currMetrics.memoryDeltaHeapUsedMB)

  const mainDelta = currMainValue - prevMainValue
  const workerDelta = currWorkerValue - prevWorkerValue
  const rssDelta = currRssValue - prevRssValue
  const heapDelta = currHeapValue - prevHeapValue

  const deltaBasis =
    (currMetrics.mainCpuMs?.cv ?? 0) > 0.15 ||
    (currMetrics.workerCpuMs?.cv ?? 0) > 0.15
      ? 'trimmed-mean (high variance)'
      : 'mean'

  console.log(`Baseline comparison: ${previous.path}`)
  console.log(`Delta basis: ${deltaBasis}`)
  console.table([
    {
      Metric: 'Main CPU ms',
      Previous: fmt(prevMainValue),
      Current: fmt(currMainValue),
      Delta: fmt(mainDelta),
      'Delta %': fmt((mainDelta / Math.max(prevMainValue, 1)) * 100),
    },
    {
      Metric: 'Worker CPU ms',
      Previous: fmt(prevWorkerValue),
      Current: fmt(currWorkerValue),
      Delta: fmt(workerDelta),
      'Delta %': fmt((workerDelta / Math.max(prevWorkerValue, 1)) * 100),
    },
    {
      Metric: 'Memory delta RSS MB',
      Previous: fmt(prevRssValue),
      Current: fmt(currRssValue),
      Delta: fmt(rssDelta),
      'Delta %': 'n/a',
    },
    {
      Metric: 'Memory delta HeapUsed MB',
      Previous: fmt(prevHeapValue),
      Current: fmt(currHeapValue),
      Delta: fmt(heapDelta),
      'Delta %': 'n/a',
    },
  ])
}

async function runSingleProfile(
  targetScript,
  analyzeScript,
  runDir,
  trainArgs,
  timeouts,
  runLabel = ''
) {
  const profilePath = join(runDir, 'profile.cpuprofile')
  const memorySummaryPath = join(runDir, 'memory.json')
  const summaryPath = join(runDir, 'summary.json')
  const workerProfileDir = join(runDir, 'workers')

  if (existsSync(runDir)) {
    rmSync(runDir, { recursive: true, force: true })
  }
  mkdirSync(runDir, { recursive: true })
  mkdirSync(workerProfileDir, { recursive: true })

  console.log(`${runLabel}CPU profile output: ${profilePath}`)
  const profileStart = Date.now()
  let collectTimeoutMs = timeouts.targetTimeoutMs
  let collected = false
  for (let attempt = 1; attempt <= 2 && !collected; attempt++) {
    const attemptLabel = attempt > 1 ? ` (attempt ${attempt}/2)` : ''
    console.log(
      `${runLabel}collecting profile${attemptLabel} (timeout ${Math.round(
        collectTimeoutMs / 1000
      )}s)...`
    )

    try {
      await waitWithHeartbeat(
        runLabel,
        'collecting profile',
        run(
          process.execPath,
          [
            '--cpu-prof',
            '--cpu-prof-dir',
            workerProfileDir,
            targetScript,
            '--profileOutput',
            profilePath,
            '--memorySummaryOutput',
            memorySummaryPath,
            ...trainArgs,
          ],
          rootDir,
          process.env,
          false,
          collectTimeoutMs
        )
      )
      collected = true
    } catch (error) {
      const timedOut = Boolean(error?.timedOut)
      if (timedOut && attempt < 2) {
        const nextTimeoutMs = Math.min(300_000, collectTimeoutMs * 2)
        console.warn(
          `${runLabel}collect timed out after ${Math.round(
            collectTimeoutMs / 1000
          )}s; retrying once with ${Math.round(nextTimeoutMs / 1000)}s`
        )
        collectTimeoutMs = nextTimeoutMs
        continue
      }
      throw error
    }
  }
  console.log(
    `${runLabel}collecting done in ${fmt((Date.now() - profileStart) / 1000)}s`
  )

  console.log(
    `${runLabel}analyzing profile (timeout ${Math.round(timeouts.analyzeTimeoutMs / 1000)}s)...`
  )
  const analyzeStart = Date.now()

  await waitWithHeartbeat(
    runLabel,
    'analyzing profile',
    run(
      process.execPath,
      [
        analyzeScript,
        profilePath,
        '--summary',
        summaryPath,
        '--worker-cpu-profile-dir',
        workerProfileDir,
        ...trainArgs,
      ],
      rootDir,
      process.env,
      false,
      timeouts.analyzeTimeoutMs
    )
  )
  console.log(
    `${runLabel}analyzing done in ${fmt((Date.now() - analyzeStart) / 1000)}s`
  )

  if (!existsSync(summaryPath)) {
    throw new Error(
      `Missing summary output after analyze phase: ${summaryPath}`
    )
  }

  const summary = readJson(summaryPath)
  summary.summaryPath = summaryPath
  return summary
}

async function main() {
  const {
    outputDir,
    name,
    nameProvided,
    runs,
    trainArgs,
    targetTimeoutMs,
    analyzeTimeoutMs,
    baseline,
  } = parseArgs(process.argv.slice(2))
  const requestedMethod = parseTrainArgString(trainArgs, '--method')
  const resolvedRunName = nameProvided
    ? name
    : `demo-${normalizeMethodName(requestedMethod)}-${new Date().toISOString().replace(/[:.]/g, '-')}`
  const profileDir = resolve(rootDir, outputDir)
  const runId = resolvedRunName.replace(/\.cpuprofile$/u, '')
  const runDir = join(profileDir, runId)
  const summaryPath = join(runDir, 'summary.json')
  const targetScript = resolve(rootDir, 'scripts/profile-target.js')
  const analyzeScript = resolve(rootDir, 'scripts/analyze-profile.js')

  await ensureBuild()
  await ensureDataset()
  mkdirSync(runDir, { recursive: true })

  console.log(`Run artifact dir: ${runDir}`)
  console.log(`Profiling runs: ${runs}`)

  const secondsLimit = parseTrainArgNumber(trainArgs, '--secondsLimit', 30)
  const computedTargetTimeoutMs = Math.max(
    30_000,
    Math.ceil(secondsLimit * 1000 * 2)
  )
  const resolvedTargetTimeoutMs = targetTimeoutMs ?? computedTargetTimeoutMs
  const resolvedAnalyzeTimeoutMs =
    analyzeTimeoutMs ?? Math.max(30_000, Math.ceil(resolvedTargetTimeoutMs / 2))
  console.log(
    `Phase timeouts: target=${Math.round(resolvedTargetTimeoutMs / 1000)}s analyze=${Math.round(
      resolvedAnalyzeTimeoutMs / 1000
    )}s`
  )

  const runSummaries = []
  for (let i = 0; i < runs; i++) {
    const runName = `run-${String(i + 1).padStart(3, '0')}`
    const subRunDir = runs === 1 ? runDir : join(runDir, runName)
    const label = runs === 1 ? '' : `[${i + 1}/${runs}] `
    const summary = await runSingleProfile(
      targetScript,
      analyzeScript,
      subRunDir,
      trainArgs,
      {
        targetTimeoutMs: resolvedTargetTimeoutMs,
        analyzeTimeoutMs: resolvedAnalyzeTimeoutMs,
      },
      label
    )
    runSummaries.push(summary)
    if (runs > 1) {
      console.log(
        `${label}main=${fmt(summary.totalMs)}ms worker=${fmt(
          summary.workerCpuSummary?.totalMs
        )}ms rssΔ=${fmt(summary.memorySummary?.delta?.rssMB)}MB heapΔ=${fmt(
          summary.memorySummary?.delta?.heapUsedMB
        )}MB`
      )
    }
  }

  if (runs === 1) {
    console.log(`Summary written: ${summaryPath}`)
    return
  }

  const aggregateSummary = aggregateRuns(runSummaries, runDir, runs)
  const baselineRequest = baseline
    ? loadNamedBaselineSummary(
        profileDir,
        baseline,
        aggregateSummary.runConfig,
        runs
      )
    : null
  const previous =
    baselineRequest?.summary != null
      ? { path: baselineRequest.path, summary: baselineRequest.summary }
      : !baseline
        ? loadPreviousAggregateSummary(
            profileDir,
            runDir,
            aggregateSummary.runConfig,
            runs
          )
        : null

  writeFileSync(summaryPath, JSON.stringify(aggregateSummary, null, 2))
  printAggregateReport(aggregateSummary, previous, baselineRequest)
  console.log(`Summary written: ${summaryPath}`)
}

main()
  .then(() => {
    process.exitCode = 0
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
