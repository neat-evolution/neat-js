import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')
const repoRoot = resolve(packageRoot, '..', '..')

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== '--')
  const allMethods = [
    'NEAT',
    'CPPN',
    'HyperNEAT',
    'ES-HyperNEAT',
    'DES-HyperNEAT',
  ]
  const options = {
    currentRepo: repoRoot,
    baselineRepo: resolve(repoRoot, '.worktrees/main'),
    outputDir: resolve(
      packageRoot,
      '.artifacts/performance-comparison/current-vs-main'
    ),
    runs: 5,
    method: 'ES-HyperNEAT',
    methods: [],
    iterations: 200,
    initialMutations: null,
    secondsLimit: 30,
    earlyStop: true,
    earlyStopPatience: null,
    earlyStopMinThreshold: 0,
    threadCount: 4,
    taskCount: 100,
    memorySampleMs: 250,
    progressLogMs: 15000,
    quietTraining: true,
    skipBuild: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--current-repo' && args[i + 1]) {
      options.currentRepo = resolve(args[++i])
    } else if (arg === '--baseline-repo' && args[i + 1]) {
      options.baselineRepo = resolve(args[++i])
    } else if (arg === '--output-dir' && args[i + 1]) {
      options.outputDir = resolve(args[++i])
    } else if (arg === '--runs' && args[i + 1]) {
      options.runs = Number(args[++i])
    } else if (arg === '--method' && args[i + 1]) {
      options.method = args[++i]
    } else if (arg === '--methods' && args[i + 1]) {
      options.methods = args[++i]
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    } else if (arg === '--all-methods') {
      options.methods = [...allMethods]
    } else if (arg === '--iterations' && args[i + 1]) {
      options.iterations = Number(args[++i])
    } else if (arg === '--initialMutations' && args[i + 1]) {
      options.initialMutations = Number(args[++i])
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
    } else if (arg === '--skip-build') {
      options.skipBuild = true
    }
  }

  options.runs = Math.max(
    1,
    Number.isFinite(options.runs) ? Math.floor(options.runs) : 5
  )
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
    Number.isFinite(options.threadCount) ? Math.floor(options.threadCount) : 4
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
  if (options.methods.length === 0) {
    options.methods = [options.method]
  }
  return options
}

async function run(command, args, cwd, capture = false) {
  const result = await execa(command, args, {
    cwd,
    stdio: capture ? 'pipe' : 'inherit',
    reject: false,
  })
  if (result.failed || result.exitCode !== 0) {
    if (capture) {
      if (result.stdout) process.stdout.write(`${result.stdout}\n`)
      if (result.stderr) process.stderr.write(`${result.stderr}\n`)
    }
    throw new Error(
      `Command failed (${result.exitCode ?? 1}): ${command} ${args.join(' ')}`
    )
  }
  return result
}

function readJson(pathname) {
  return JSON.parse(readFileSync(pathname, 'utf8'))
}

function mean(values) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function median(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function trimmedMean(values, trimFraction = 0.1) {
  if (values.length === 0) return 0
  if (values.length < 3) return mean(values)
  const sorted = [...values].sort((a, b) => a - b)
  const trimCount = Math.min(
    Math.floor(sorted.length * trimFraction),
    Math.floor((sorted.length - 1) / 2)
  )
  const trimmed =
    trimCount > 0 ? sorted.slice(trimCount, sorted.length - trimCount) : sorted
  return mean(trimmed)
}

function stdev(values) {
  if (values.length < 2) return 0
  const avg = mean(values)
  const variance =
    values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function fmt(value) {
  return Number(value.toFixed(3))
}

function summarizeRuns(results) {
  const metricSelectors = {
    elapsedMs: (run) => run.metrics.elapsedMs,
    cpuTotalMs: (run) => run.metrics.cpuTotalMs,
    cpuToWallRatio: (run) => run.metrics.cpuToWallRatio,
    peakRssMB: (run) => run.memory.peak.rssMB,
    peakHeapUsedMB: (run) => run.memory.peak.heapUsedMB,
    deltaRssMB: (run) => run.memory.delta.rssMB,
    deltaHeapUsedMB: (run) => run.memory.delta.heapUsedMB,
    bestFitness: (run) => run.bestFitness ?? 0,
  }

  const summary = {}
  for (const [name, select] of Object.entries(metricSelectors)) {
    const values = results.map(select)
    summary[name] = {
      count: values.length,
      mean: values.length > 0 ? fmt(mean(values)) : null,
      median: values.length > 0 ? fmt(median(values)) : null,
      trimmedMean: values.length > 0 ? fmt(trimmedMean(values)) : null,
      min: values.length > 0 ? fmt(Math.min(...values)) : null,
      max: values.length > 0 ? fmt(Math.max(...values)) : null,
      stdev: values.length > 0 ? fmt(stdev(values)) : null,
    }
  }
  return summary
}

function percentDelta(current, baseline, invert = false) {
  if (
    !Number.isFinite(current) ||
    !Number.isFinite(baseline) ||
    baseline === 0
  ) {
    return null
  }
  const raw = ((current - baseline) / baseline) * 100
  return fmt(invert ? -raw : raw)
}

function buildComparison(currentRuns, baselineRuns) {
  const currentSummary = summarizeRuns(currentRuns)
  const baselineSummary = summarizeRuns(baselineRuns)
  const comparisons = {
    elapsedMsPct: percentDelta(
      currentSummary.elapsedMs.mean,
      baselineSummary.elapsedMs.mean,
      true
    ),
    cpuTotalMsPct: percentDelta(
      currentSummary.cpuTotalMs.mean,
      baselineSummary.cpuTotalMs.mean,
      true
    ),
    peakRssMBPct: percentDelta(
      currentSummary.peakRssMB.mean,
      baselineSummary.peakRssMB.mean,
      true
    ),
    peakHeapUsedMBPct: percentDelta(
      currentSummary.peakHeapUsedMB.mean,
      baselineSummary.peakHeapUsedMB.mean,
      true
    ),
    deltaRssMBPct: percentDelta(
      currentSummary.deltaRssMB.mean,
      baselineSummary.deltaRssMB.mean,
      true
    ),
    deltaHeapUsedMBPct: percentDelta(
      currentSummary.deltaHeapUsedMB.mean,
      baselineSummary.deltaHeapUsedMB.mean,
      true
    ),
    bestFitnessPct: percentDelta(
      currentSummary.bestFitness.mean,
      baselineSummary.bestFitness.mean,
      false
    ),
  }

  return {
    current: currentSummary,
    baseline: baselineSummary,
    comparisons,
  }
}

function displayValue(value) {
  return value == null ? 'pending' : String(value)
}

function renderTableRow(name, current, baseline, delta) {
  const deltaText =
    delta == null ? 'pending' : `${delta > 0 ? '+' : ''}${delta}%`
  return `| ${name} | ${displayValue(current)} | ${displayValue(baseline)} | ${deltaText} |`
}

function formatDelta(delta) {
  return delta == null ? 'pending' : `${delta > 0 ? '+' : ''}${delta}%`
}

function renderDistributionRow(
  name,
  currentMetric,
  baselineMetric,
  invert = true
) {
  return `| ${name} | ${displayValue(currentMetric.mean)} | ${displayValue(
    currentMetric.median
  )} | ${displayValue(currentMetric.trimmedMean)} | ${displayValue(
    baselineMetric.mean
  )} | ${displayValue(baselineMetric.median)} | ${displayValue(
    baselineMetric.trimmedMean
  )} | ${formatDelta(
    percentDelta(currentMetric.mean, baselineMetric.mean, invert)
  )} | ${formatDelta(
    percentDelta(currentMetric.median, baselineMetric.median, invert)
  )} | ${formatDelta(
    percentDelta(currentMetric.trimmedMean, baselineMetric.trimmedMean, invert)
  )} |`
}

function renderMarkdownReport(state) {
  const comparison = buildComparison(state.runs.current, state.runs.main)
  const distributionRows = [
    renderDistributionRow(
      'Elapsed ms',
      comparison.current.elapsedMs,
      comparison.baseline.elapsedMs,
      true
    ),
    renderDistributionRow(
      'CPU total ms',
      comparison.current.cpuTotalMs,
      comparison.baseline.cpuTotalMs,
      true
    ),
    renderDistributionRow(
      'Peak RSS MB',
      comparison.current.peakRssMB,
      comparison.baseline.peakRssMB,
      true
    ),
    renderDistributionRow(
      'Peak heap used MB',
      comparison.current.peakHeapUsedMB,
      comparison.baseline.peakHeapUsedMB,
      true
    ),
    renderDistributionRow(
      'Best fitness',
      comparison.current.bestFitness,
      comparison.baseline.bestFitness,
      false
    ),
  ]
  const rows = [
    renderTableRow(
      'Elapsed ms',
      comparison.current.elapsedMs.mean,
      comparison.baseline.elapsedMs.mean,
      comparison.comparisons.elapsedMsPct
    ),
    renderTableRow(
      'CPU total ms',
      comparison.current.cpuTotalMs.mean,
      comparison.baseline.cpuTotalMs.mean,
      comparison.comparisons.cpuTotalMsPct
    ),
    renderTableRow(
      'CPU/wall ratio',
      comparison.current.cpuToWallRatio.mean,
      comparison.baseline.cpuToWallRatio.mean,
      null
    ),
    renderTableRow(
      'Peak RSS MB',
      comparison.current.peakRssMB.mean,
      comparison.baseline.peakRssMB.mean,
      comparison.comparisons.peakRssMBPct
    ),
    renderTableRow(
      'Peak heap used MB',
      comparison.current.peakHeapUsedMB.mean,
      comparison.baseline.peakHeapUsedMB.mean,
      comparison.comparisons.peakHeapUsedMBPct
    ),
    renderTableRow(
      'RSS delta MB',
      comparison.current.deltaRssMB.mean,
      comparison.baseline.deltaRssMB.mean,
      comparison.comparisons.deltaRssMBPct
    ),
    renderTableRow(
      'Heap used delta MB',
      comparison.current.deltaHeapUsedMB.mean,
      comparison.baseline.deltaHeapUsedMB.mean,
      comparison.comparisons.deltaHeapUsedMBPct
    ),
    renderTableRow(
      'Best fitness',
      comparison.current.bestFitness.mean,
      comparison.baseline.bestFitness.mean,
      comparison.comparisons.bestFitnessPct
    ),
  ]

  const perRunLines = []
  for (
    let i = 0;
    i < Math.max(state.runs.current.length, state.runs.main.length);
    i++
  ) {
    const current = state.runs.current[i]
    const baseline = state.runs.main[i]
    perRunLines.push(
      `| ${i + 1} | ${current?.metrics.elapsedMs ?? 'pending'} | ${baseline?.metrics.elapsedMs ?? 'pending'} | ${current?.memory.peak.rssMB ?? 'pending'} | ${baseline?.memory.peak.rssMB ?? 'pending'} |`
    )
  }

  return [
    '# Demo Performance Comparison',
    '',
    `Updated: ${state.updatedAt}`,
    '',
    '## Config',
    '',
    `- current repo: \`${state.currentRepo}\``,
    `- baseline repo: \`${state.baselineRepo}\``,
    `- runs completed: ${state.runs.current.length}/${state.config.runs}`,
    `- method: ${state.config.method}`,
    `- demo iterations: ${state.config.iterations}`,
    `- seconds limit: ${state.config.secondsLimit}`,
    `- early stop: ${state.config.earlyStop}`,
    `- early stop patience: ${state.config.earlyStopPatience}`,
    `- early stop min threshold: ${state.config.earlyStopMinThreshold}`,
    `- thread count: ${state.config.threadCount}`,
    `- task count: ${state.config.taskCount}`,
    `- memory sample ms: ${state.config.memorySampleMs}`,
    '',
    '## Distribution Summary',
    '',
    '| Metric | Current mean | Current median | Current trimmed mean | Baseline mean | Baseline median | Baseline trimmed mean | Mean delta | Median delta | Trimmed delta |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...distributionRows,
    '',
    'Trimmed mean removes the top and bottom 10% of runs when enough samples exist.',
    '',
    '## Aggregate',
    '',
    '| Metric | Current mean | Baseline mean | Delta |',
    '| --- | ---: | ---: | ---: |',
    ...rows,
    '',
    'Positive deltas indicate an improvement for lower-is-better metrics.',
    'Best fitness is higher-is-better, so its delta is shown in the natural direction.',
    '',
    '## Per Run',
    '',
    '| Run | Current elapsed ms | Baseline elapsed ms | Current peak RSS MB | Baseline peak RSS MB |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...perRunLines,
    '',
    '## Raw Artifacts',
    '',
    `- JSON summary: \`${resolve(state.outputDir, 'latest.json')}\``,
    `- current runs: \`${resolve(state.outputDir, 'runs/current')}\``,
    `- main runs: \`${resolve(state.outputDir, 'runs/main')}\``,
    '',
  ].join('\n')
}

function writeReport(state) {
  mkdirSync(state.outputDir, { recursive: true })
  writeFileSync(
    resolve(state.outputDir, 'latest.json'),
    JSON.stringify(state, null, 2)
  )
  writeFileSync(
    resolve(state.outputDir, 'latest.md'),
    renderMarkdownReport(state)
  )
}

function slugifyMethod(method) {
  return method.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function buildMethodState(options, method, outputDir) {
  return {
    currentRepo: options.currentRepo,
    baselineRepo: options.baselineRepo,
    outputDir,
    updatedAt: new Date().toISOString(),
    config: {
      runs: options.runs,
      method,
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
    runs: {
      current: [],
      main: [],
    },
  }
}

function renderIndexReport(indexState) {
  const rows = indexState.methods.map((methodState) => {
    const comparison = buildComparison(
      methodState.runs.current,
      methodState.runs.main
    )
    return `| ${methodState.config.method} | ${displayValue(comparison.current.elapsedMs.mean)} | ${displayValue(comparison.baseline.elapsedMs.mean)} | ${formatDelta(comparison.comparisons.elapsedMsPct)} | ${formatDelta(percentDelta(comparison.current.elapsedMs.median, comparison.baseline.elapsedMs.median, true))} | ${displayValue(comparison.current.peakRssMB.mean)} | ${displayValue(comparison.baseline.peakRssMB.mean)} |`
  })

  return [
    '# Demo Performance Comparison Index',
    '',
    `Updated: ${indexState.updatedAt}`,
    '',
    `Runs per method: ${indexState.config.runs}`,
    `Demo iterations: ${indexState.config.iterations}`,
    `Seconds limit: ${indexState.config.secondsLimit}`,
    `Early stop: ${indexState.config.earlyStop}`,
    `Early stop patience: ${indexState.config.earlyStopPatience}`,
    `Early stop min threshold: ${indexState.config.earlyStopMinThreshold}`,
    `Thread count: ${indexState.config.threadCount}`,
    `Task count: ${indexState.config.taskCount}`,
    '',
    '| Method | Current elapsed ms | Baseline elapsed ms | Mean delta | Median delta | Current peak RSS MB | Baseline peak RSS MB |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows,
    '',
  ].join('\n')
}

function writeIndexReport(indexState) {
  mkdirSync(indexState.outputDir, { recursive: true })
  writeFileSync(
    resolve(indexState.outputDir, 'latest.json'),
    JSON.stringify(indexState, null, 2)
  )
  writeFileSync(
    resolve(indexState.outputDir, 'latest.md'),
    renderIndexReport(indexState)
  )
}

async function ensurePrepared(repoRootToUse, skipBuild) {
  await run('node', ['packages/demo/scripts/iris.js'], repoRootToUse)
  if (!skipBuild) {
    await run(
      'yarn',
      ['workspace', '@neat-evolution/demo', 'build'],
      repoRootToUse
    )
  } else if (
    !existsSync(resolve(repoRootToUse, 'packages/demo/dist/esm/demo.js'))
  ) {
    throw new Error(
      `Build output missing in ${repoRootToUse}; rerun without --skip-build`
    )
  }
}

async function runTarget(repoRootToUse, runLabel, options, outputPath) {
  const scriptPath = resolve(
    repoRootToUse,
    'packages/demo/scripts/perf-compare-target.js'
  )
  const args = [
    scriptPath,
    '--package-root',
    resolve(repoRootToUse, 'packages/demo'),
    '--output',
    outputPath,
    '--method',
    options.method,
    '--seed',
    options.seed,
    '--iterations',
    String(options.iterations),
    '--secondsLimit',
    String(options.secondsLimit),
    '--earlyStop',
    String(options.earlyStop),
    '--earlyStopPatience',
    String(options.earlyStopPatience),
    '--earlyStopMinThreshold',
    String(options.earlyStopMinThreshold),
    '--threadCount',
    String(options.threadCount),
    '--taskCount',
    String(options.taskCount),
    '--memorySampleMs',
    String(options.memorySampleMs),
    '--progress-log-ms',
    String(options.progressLogMs),
  ]
  if (Number.isFinite(options.initialMutations)) {
    args.push('--initialMutations', String(options.initialMutations))
  }
  if (options.quietTraining) {
    args.push('--quiet-training')
  }

  console.log(`[compare-worktree-performance] ${runLabel}`)
  await run('node', args, repoRootToUse)
  return readJson(outputPath)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const indexState = {
    outputDir: options.outputDir,
    updatedAt: new Date().toISOString(),
    config: {
      runs: options.runs,
      iterations: options.iterations,
      secondsLimit: options.secondsLimit,
      earlyStop: options.earlyStop,
      earlyStopPatience: options.earlyStopPatience,
      earlyStopMinThreshold: options.earlyStopMinThreshold,
      threadCount: options.threadCount,
      taskCount: options.taskCount,
      memorySampleMs: options.memorySampleMs,
      methods: options.methods,
      ...(Number.isFinite(options.initialMutations)
        ? { initialMutations: options.initialMutations }
        : {}),
    },
    methods: options.methods.map((method) =>
      buildMethodState(
        options,
        method,
        resolve(options.outputDir, slugifyMethod(method))
      )
    ),
  }

  writeIndexReport(indexState)

  await ensurePrepared(options.currentRepo, options.skipBuild)
  await ensurePrepared(options.baselineRepo, options.skipBuild)

  for (const methodState of indexState.methods) {
    mkdirSync(resolve(methodState.outputDir, 'runs/current'), {
      recursive: true,
    })
    mkdirSync(resolve(methodState.outputDir, 'runs/main'), { recursive: true })
    writeReport(methodState)

    const methodOptions = { ...options, method: methodState.config.method }
    for (let index = 0; index < options.runs; index++) {
      const runId = String(index + 1).padStart(3, '0')
      const runSeed = `current-vs-main-${runId}`
      const currentOutput = resolve(
        methodState.outputDir,
        'runs/current',
        `run-${runId}.json`
      )
      const baselineOutput = resolve(
        methodState.outputDir,
        'runs/main',
        `run-${runId}.json`
      )

      const currentRun = await runTarget(
        options.currentRepo,
        `${methodState.config.method} current run ${runId}/${String(options.runs).padStart(3, '0')}`,
        { ...methodOptions, seed: runSeed },
        currentOutput
      )
      methodState.runs.current.push(currentRun)
      methodState.updatedAt = new Date().toISOString()
      writeReport(methodState)
      indexState.updatedAt = methodState.updatedAt
      writeIndexReport(indexState)

      const baselineRun = await runTarget(
        options.baselineRepo,
        `${methodState.config.method} main run ${runId}/${String(options.runs).padStart(3, '0')}`,
        { ...methodOptions, seed: runSeed },
        baselineOutput
      )
      methodState.runs.main.push(baselineRun)
      methodState.updatedAt = new Date().toISOString()
      writeReport(methodState)
      indexState.updatedAt = methodState.updatedAt
      writeIndexReport(indexState)
    }
  }
}

main().catch((error) => {
  console.error('Worktree performance comparison failed:', error)
  process.exit(1)
})
