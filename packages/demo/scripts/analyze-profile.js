import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')
const repoRoot = resolve(packageRoot, '..', '..')
const defaultProfilePath = join(
  packageRoot,
  '.artifacts/cpuprofiles/latest.cpuprofile'
)

function deriveDefaultArtifactPaths(profilePath) {
  const base = basename(profilePath)
  const dir = dirname(profilePath)
  if (base === 'profile.cpuprofile') {
    return {
      summaryPath: join(dir, 'summary.json'),
      memoryPath: join(dir, 'memory.json'),
      workerDir: join(dir, 'workers'),
    }
  }
  return {
    summaryPath: profilePath.replace(/\.cpuprofile$/u, '.summary.json'),
    memoryPath: profilePath.replace(/\.cpuprofile$/u, '.memory.json'),
    workerDir: profilePath.replace(/\.cpuprofile$/u, '.workers'),
  }
}

function resolveInputPath(inputPath) {
  if (!inputPath) return defaultProfilePath
  const candidates = [
    resolve(process.cwd(), inputPath),
    resolve(packageRoot, inputPath),
    resolve(repoRoot, inputPath),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return resolve(process.cwd(), inputPath)
}

function parseArgs(argv) {
  const args = argv.filter((arg) => arg !== '--')
  let profileArg = ''
  const flagStartIndex =
    args.findIndex((arg) => arg.startsWith('--')) >= 0
      ? args.findIndex((arg) => arg.startsWith('--'))
      : args.length
  if (flagStartIndex > 0) {
    profileArg = args[0]
  }

  const options = {
    profilePath: resolveInputPath(profileArg),
    top: 30,
    branchTop: 30,
    summaryPath: '',
    memorySummaryPath: '',
    includeRuntime: false,
    sort: 'total',
    repoOnly: false,
    workerCpuProfileDir: '',
    noWorkerProfile: false,
    excludeWorkerProfiles: [],
    verboseReport: false,
  }

  for (let i = profileArg ? 1 : 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--top' && args[i + 1]) {
      options.top = Number(args[++i]) || options.top
    } else if (arg === '--branch-top' && args[i + 1]) {
      options.branchTop = Number(args[++i]) || options.branchTop
    } else if (arg === '--summary' && args[i + 1]) {
      options.summaryPath = resolve(process.cwd(), args[++i])
    } else if (arg === '--memory-summary' && args[i + 1]) {
      options.memorySummaryPath = resolveInputPath(args[++i])
    } else if (arg === '--include-runtime') {
      options.includeRuntime = true
    } else if (arg === '--sort' && args[i + 1]) {
      const sortMode = args[++i]
      options.sort = sortMode === 'self' ? 'self' : 'total'
    } else if (arg === '--repo-only') {
      options.repoOnly = true
    } else if (arg === '--worker-cpu-profile-dir' && args[i + 1]) {
      options.workerCpuProfileDir = resolveInputPath(args[++i])
    } else if (arg === '--no-worker-profile') {
      options.noWorkerProfile = true
    } else if (arg === '--exclude-worker-profile' && args[i + 1]) {
      options.excludeWorkerProfiles.push(args[++i])
    } else if (arg === '--verbose-report') {
      options.verboseReport = true
    }
  }

  return options
}

function normalizeSourcePath(url) {
  if (!url) return ''
  if (url.startsWith('file://')) {
    try {
      return fileURLToPath(url)
    } catch {
      return url
    }
  }
  return url
}

function formatLabel(callFrame) {
  const fn = callFrame.functionName || '(anonymous)'
  const sourcePath = normalizeSourcePath(callFrame.url)
  const isRepoPath = isAbsolute(sourcePath) && sourcePath.startsWith(repoRoot)
  const source = isRepoPath
    ? relative(repoRoot, sourcePath)
    : basename(sourcePath)
  const line = callFrame.lineNumber ? callFrame.lineNumber + 1 : 0
  return source && line > 0 ? `${fn} (${source}:${line})` : fn
}

function callFrameKey(callFrame) {
  return `${callFrame.functionName || '(anonymous)'}|${normalizeSourcePath(callFrame.url)}|${callFrame.lineNumber || 0}|${callFrame.columnNumber || 0}`
}

function analyzeCpuprofileDetailed(profile) {
  const nodes = profile.nodes || []
  const samples = profile.samples || []
  const timeDeltas = profile.timeDeltas || []

  const nodeById = new Map()
  const parentById = new Map()
  for (const node of nodes) {
    nodeById.set(node.id, node)
    const children = node.children || []
    for (const childId of children) {
      parentById.set(childId, node.id)
    }
  }

  const ancestorCache = new Map()
  function ancestors(nodeId) {
    if (ancestorCache.has(nodeId)) return ancestorCache.get(nodeId)
    const chain = []
    let currentId = nodeId
    while (currentId !== undefined) {
      chain.push(currentId)
      currentId = parentById.get(currentId)
    }
    ancestorCache.set(nodeId, chain)
    return chain
  }

  const nodeMetrics = new Map()
  function ensureNodeMetric(nodeId) {
    const node = nodeById.get(nodeId)
    if (!node) return null
    const existing = nodeMetrics.get(nodeId)
    if (existing) return existing
    const created = {
      id: nodeId,
      callFrame: node.callFrame,
      function: formatLabel(node.callFrame),
      sourcePath: normalizeSourcePath(node.callFrame.url),
      frameKey: callFrameKey(node.callFrame),
      selfSamples: 0,
      selfMs: 0,
      totalSamples: 0,
      totalMs: 0,
    }
    nodeMetrics.set(nodeId, created)
    return created
  }

  const chainCache = new Map()
  function chainRootToNode(nodeId) {
    if (chainCache.has(nodeId)) return chainCache.get(nodeId)
    const chain = ancestors(nodeId).reverse()
    chainCache.set(nodeId, chain)
    return chain
  }

  for (let i = 0; i < samples.length; i++) {
    const nodeId = samples[i]
    const deltaUs = timeDeltas[i] || 0
    const deltaMs = deltaUs / 1000

    const selfNode = nodeById.get(nodeId)
    if (!selfNode) continue

    const selfEntry = ensureNodeMetric(nodeId)
    if (!selfEntry) continue
    selfEntry.selfSamples += 1
    selfEntry.selfMs += deltaMs

    const chain = ancestors(nodeId)
    for (const ancestorId of chain) {
      const entry = ensureNodeMetric(ancestorId)
      if (!entry) continue
      entry.totalSamples += 1
      entry.totalMs += deltaMs
    }
  }

  const totalMs = timeDeltas.reduce((sum, value) => sum + value, 0) / 1000
  const rows = [...nodeMetrics.values()].sort((a, b) => b.selfMs - a.selfMs)

  const byFunction = new Map()
  for (const row of rows) {
    const entry = byFunction.get(row.frameKey) || {
      function: row.function,
      sourcePath: row.sourcePath,
      key: row.frameKey,
      selfSamples: 0,
      selfMs: 0,
      totalSamples: 0,
      totalMs: 0,
    }
    entry.selfSamples += row.selfSamples
    entry.selfMs += row.selfMs
    entry.totalSamples += row.totalSamples
    entry.totalMs += row.totalMs
    byFunction.set(row.frameKey, entry)
  }
  const functionRows = [...byFunction.values()].sort(
    (a, b) => b.selfMs - a.selfMs
  )

  const nodeRows = rows.map((row) => {
    const chain = chainRootToNode(row.id)
    const pathFrameKeys = chain
      .map((id) => nodeMetrics.get(id))
      .filter(Boolean)
      .map((entry) => entry.frameKey)
    const pathFunctions = chain
      .map((id) => nodeMetrics.get(id))
      .filter(Boolean)
      .map((entry) => entry.function)
    const pathKey = pathFrameKeys.join(' -> ')
    const parentPathKey = pathFrameKeys.slice(0, -1).join(' -> ')

    return {
      ...row,
      pathKey,
      parentPathKey,
      depth: Math.max(0, chain.length - 1),
      pathFunctions,
      maxChildPct: 0,
    }
  })

  return { totalMs, rows: functionRows, nodeRows }
}

function _analyzeCpuprofile(profile) {
  const detailed = analyzeCpuprofileDetailed(profile)
  return { totalMs: detailed.totalMs, rows: detailed.rows }
}

function parseCpuprofileContent(content) {
  const parsed = JSON.parse(content)
  return typeof parsed === 'string' ? JSON.parse(parsed) : parsed
}

function toMB(bytes) {
  return bytes / (1024 * 1024)
}

function readJsonIfExists(pathname) {
  if (!pathname || !existsSync(pathname)) return null
  try {
    return JSON.parse(readFileSync(pathname, 'utf8'))
  } catch {
    return null
  }
}

function selectPhaseRange(samples, startTs, endTs) {
  let startIndex = 0
  let endIndex = samples.length - 1

  for (let i = 0; i < samples.length; i++) {
    if (samples[i].ts <= startTs) startIndex = i
    if (samples[i].ts >= endTs) {
      endIndex = i
      break
    }
  }

  if (endIndex <= startIndex) {
    endIndex = Math.min(samples.length - 1, startIndex + 1)
  }

  return [samples[startIndex], samples[endIndex]]
}

function summarizeMemoryPhases(samples) {
  if (!Array.isArray(samples) || samples.length < 2) return []

  const firstTs = samples[0].ts
  const lastTs = samples[samples.length - 1].ts
  const totalDuration = Math.max(1, lastTs - firstTs)

  const phases = [
    { phase: 'init', startRatio: 0, endRatio: 1 / 3 },
    { phase: 'warmup', startRatio: 1 / 3, endRatio: 2 / 3 },
    { phase: 'steady_state', startRatio: 2 / 3, endRatio: 1 },
  ]

  return phases.map((p) => {
    const startTs = firstTs + totalDuration * p.startRatio
    const endTs = firstTs + totalDuration * p.endRatio
    const [startSample, endSample] = selectPhaseRange(samples, startTs, endTs)
    const durationMs = Math.max(1, endSample.ts - startSample.ts)
    const durationSec = durationMs / 1000

    const deltaRssMB = toMB(endSample.rss - startSample.rss)
    const deltaHeapUsedMB = toMB(endSample.heapUsed - startSample.heapUsed)
    const deltaHeapTotalMB = toMB(endSample.heapTotal - startSample.heapTotal)

    return {
      phase: p.phase,
      durationMs,
      startMsFromRunStart: startSample.ts - firstTs,
      endMsFromRunStart: endSample.ts - firstTs,
      delta: {
        rssMB: deltaRssMB,
        heapUsedMB: deltaHeapUsedMB,
        heapTotalMB: deltaHeapTotalMB,
        rssMBPerSec: deltaRssMB / durationSec,
        heapUsedMBPerSec: deltaHeapUsedMB / durationSec,
        heapTotalMBPerSec: deltaHeapTotalMB / durationSec,
      },
    }
  })
}

function summarizeMemory(memorySummary) {
  if (memorySummary == null || memorySummary.memory == null) {
    return null
  }

  const startedAt = memorySummary.startedAt ?? 0
  const endedAt = memorySummary.endedAt ?? startedAt
  const durationMs = Math.max(1, endedAt - startedAt)
  const durationSec = durationMs / 1000
  const memory = memorySummary.memory

  const deltaRssMB = toMB(memory.delta?.rss ?? 0)
  const deltaHeapUsedMB = toMB(memory.delta?.heapUsed ?? 0)
  const deltaHeapTotalMB = toMB(memory.delta?.heapTotal ?? 0)
  const phases = summarizeMemoryPhases(memorySummary.samples || [])

  const summary = {
    path: memorySummary.path ?? '',
    durationMs,
    sampleCount: memory.sampleCount ?? 0,
    first: {
      rssMB: toMB(memory.first?.rss ?? 0),
      heapUsedMB: toMB(memory.first?.heapUsed ?? 0),
      heapTotalMB: toMB(memory.first?.heapTotal ?? 0),
    },
    last: {
      rssMB: toMB(memory.last?.rss ?? 0),
      heapUsedMB: toMB(memory.last?.heapUsed ?? 0),
      heapTotalMB: toMB(memory.last?.heapTotal ?? 0),
    },
    max: {
      rssMB: toMB(memory.max?.rss ?? 0),
      heapUsedMB: toMB(memory.max?.heapUsed ?? 0),
      heapTotalMB: toMB(memory.max?.heapTotal ?? 0),
    },
    delta: {
      rssMB: deltaRssMB,
      heapUsedMB: deltaHeapUsedMB,
      heapTotalMB: deltaHeapTotalMB,
      rssMBPerSec: deltaRssMB / durationSec,
      heapUsedMBPerSec: deltaHeapUsedMB / durationSec,
      heapTotalMBPerSec: deltaHeapTotalMB / durationSec,
    },
    phases,
    assessment: [],
  }

  if (
    deltaHeapUsedMB > 100 &&
    summary.last.heapUsedMB > summary.first.heapUsedMB * 2
  ) {
    summary.assessment.push('possible_heap_leak_signal')
  }
  if (deltaRssMB > 250 && deltaHeapUsedMB < 50) {
    summary.assessment.push('rss_growth_exceeds_heap_used_growth')
  }
  if ((memory.sampleCount ?? 0) < 6) {
    summary.assessment.push('insufficient_memory_samples_for_confidence')
  }
  if (summary.assessment.length === 0) {
    summary.assessment.push('no_strong_leak_signal_in_run_window')
  }

  return summary
}

function filterAndSortRows(rows, options, totalMs) {
  const filteredBase = options.includeRuntime
    ? rows
    : rows.filter(
        (row) =>
          row.function !== '(idle)' &&
          row.function !== '(program)' &&
          row.function !== '(root)'
      )

  const repoFiltered = options.repoOnly
    ? filteredBase.filter(
        (row) =>
          isAbsolute(row.sourcePath) &&
          row.sourcePath.startsWith(repoRoot) &&
          !row.sourcePath.includes('/node_modules/')
      )
    : filteredBase

  const sorted =
    options.sort === 'self'
      ? repoFiltered.sort((a, b) => b.selfMs - a.selfMs)
      : repoFiltered.sort((a, b) => b.totalMs - a.totalMs)

  return {
    totalMs,
    rows: sorted,
  }
}

function formatTopRows(rows, totalMs) {
  return rows.map((row) => ({
    Function:
      row.function.length > 100
        ? `${row.function.slice(0, 97)}...`
        : row.function,
    'Self ms': Number(row.selfMs.toFixed(2)),
    'Self %': Number(((row.selfMs / Math.max(totalMs, 1)) * 100).toFixed(2)),
    'Total ms': Number(row.totalMs.toFixed(2)),
    'Total %': Number(((row.totalMs / Math.max(totalMs, 1)) * 100).toFixed(2)),
    'Self Samples': row.selfSamples,
    'Total Samples': row.totalSamples,
  }))
}

function isRuntimeFunctionLabel(label) {
  return label === '(idle)' || label === '(program)' || label === '(root)'
}

function filterNodeRows(rows, options) {
  const filteredBase = options.includeRuntime
    ? rows
    : rows.filter((row) => !isRuntimeFunctionLabel(row.function))

  return options.repoOnly
    ? filteredBase.filter(
        (row) =>
          isAbsolute(row.sourcePath) &&
          row.sourcePath.startsWith(repoRoot) &&
          !row.sourcePath.includes('/node_modules/')
      )
    : filteredBase
}

function mergeNodeRowsByPath(rows) {
  const aggregateByPath = new Map()
  const childTotalsByParent = new Map()

  for (const row of rows) {
    const current = aggregateByPath.get(row.pathKey) || {
      function: row.function,
      sourcePath: row.sourcePath,
      pathKey: row.pathKey,
      parentPathKey: row.parentPathKey,
      depth: row.depth,
      pathFunctions: row.pathFunctions,
      selfSamples: 0,
      selfMs: 0,
      totalSamples: 0,
      totalMs: 0,
      maxChildPct: 0,
    }
    current.selfSamples += row.selfSamples
    current.selfMs += row.selfMs
    current.totalSamples += row.totalSamples
    current.totalMs += row.totalMs
    aggregateByPath.set(row.pathKey, current)

    if (row.parentPathKey) {
      const childMap = childTotalsByParent.get(row.parentPathKey) || new Map()
      childMap.set(row.pathKey, (childMap.get(row.pathKey) || 0) + row.totalMs)
      childTotalsByParent.set(row.parentPathKey, childMap)
    }
  }

  for (const row of aggregateByPath.values()) {
    const childMap = childTotalsByParent.get(row.pathKey)
    if (childMap == null || childMap.size === 0 || row.totalMs <= 0) {
      row.maxChildPct = 0
      continue
    }
    let maxChildTotalMs = 0
    for (const childTotalMs of childMap.values()) {
      if (childTotalMs > maxChildTotalMs) maxChildTotalMs = childTotalMs
    }
    row.maxChildPct = maxChildTotalMs / row.totalMs
  }

  return [...aggregateByPath.values()]
}

function compactPath(pathFunctions, keep = 6) {
  if (!Array.isArray(pathFunctions) || pathFunctions.length === 0) return ''
  const compactNames = pathFunctions.map((label) => {
    const i = label.indexOf(' (')
    return i > 0 ? label.slice(0, i) : label
  })
  if (compactNames.length <= keep) return compactNames.join(' -> ')
  const tail = compactNames.slice(-keep).join(' -> ')
  return `... -> ${tail}`
}

function buildBottleneckBranches(nodeRows, totalMs, options, limit = 30) {
  const filtered = filterNodeRows(nodeRows, options)
  const merged = mergeNodeRowsByPath(filtered)

  const scored = merged
    .filter((row) => row.selfMs > 0)
    .map((row) => {
      const exclusivePct = row.selfMs / Math.max(row.totalMs, 1)
      const delegatedPct = 1 - exclusivePct
      const deEmphasized = row.maxChildPct >= 0.8 && exclusivePct <= 0.2
      const score = row.selfMs * (0.35 + exclusivePct)
      return {
        ...row,
        exclusivePct,
        delegatedPct,
        deEmphasized,
        score,
        selfPctOfProfile: row.selfMs / Math.max(totalMs, 1),
        totalPctOfProfile: row.totalMs / Math.max(totalMs, 1),
        branch: compactPath(row.pathFunctions),
      }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.selfMs !== a.selfMs) return b.selfMs - a.selfMs
      return b.totalMs - a.totalMs
    })

  const primary = scored.filter((row) => !row.deEmphasized).slice(0, limit)
  const fallback = scored.filter((row) => row.deEmphasized).slice(0, limit)
  const top = primary.length > 0 ? primary : fallback

  return {
    totalNodes: merged.length,
    candidates: scored.length,
    selected: top.length,
    branches: top,
  }
}

function sourcePackageName(sourcePath) {
  if (!sourcePath) return ''
  const normalized = normalizeSourcePath(sourcePath)
  let rel = normalized
  if (isAbsolute(normalized) && normalized.startsWith(repoRoot)) {
    rel = relative(repoRoot, normalized)
  }
  const match = rel.match(/^packages\/([^/]+)\//)
  return match?.[1] ?? ''
}

function buildHotspotSummary(mainRows, workerRows, mainTotalMs, workerTotalMs) {
  const hasWorker = Array.isArray(workerRows) && workerRows.length > 0
  const baseRows = hasWorker ? workerRows : mainRows
  const referenceTotalMs = hasWorker ? workerTotalMs : mainTotalMs

  const byPackage = new Map()
  for (const row of baseRows) {
    const pkg = sourcePackageName(row.sourcePath)
    if (!pkg) continue
    const current = byPackage.get(pkg) || {
      package: pkg,
      selfMs: 0,
      totalMs: 0,
      functionCount: 0,
    }
    current.selfMs += row.selfMs
    current.totalMs += row.totalMs
    current.functionCount += 1
    byPackage.set(pkg, current)
  }

  const packageRows = [...byPackage.values()]
    .sort((a, b) => b.selfMs - a.selfMs)
    .slice(0, 10)
    .map((row) => {
      const selfPct = (row.selfMs / Math.max(referenceTotalMs, 1)) * 100
      let estimatedImpact = 'low'
      if (selfPct >= 8) estimatedImpact = 'high'
      else if (selfPct >= 3) estimatedImpact = 'medium'

      return {
        ...row,
        selfPct,
        totalPct: (row.totalMs / Math.max(referenceTotalMs, 1)) * 100,
        estimatedImpact,
      }
    })

  const functionRows = baseRows
    .filter((row) => sourcePackageName(row.sourcePath))
    .slice(0, 15)
    .map((row) => {
      const selfPct = (row.selfMs / Math.max(referenceTotalMs, 1)) * 100
      let estimatedImpact = 'low'
      if (selfPct >= 5) estimatedImpact = 'high'
      else if (selfPct >= 2) estimatedImpact = 'medium'
      return {
        function: row.function,
        selfMs: row.selfMs,
        totalMs: row.totalMs,
        selfPct,
        totalPct: (row.totalMs / Math.max(referenceTotalMs, 1)) * 100,
        estimatedImpact,
      }
    })

  return {
    basedOn: hasWorker ? 'worker' : 'main',
    referenceTotalMs,
    packageHotspots: packageRows,
    functionHotspots: functionRows,
  }
}

function buildConfidenceSummary(mainTotalMs, workerCpuSummary, memorySummary) {
  const markers = []
  let score = 0

  const cpuDurationSec = mainTotalMs / 1000
  if (cpuDurationSec >= 10) {
    markers.push('cpu_window_sufficient')
    score += 1
  } else {
    markers.push('short_cpu_window')
  }

  const workerProfileCount = workerCpuSummary?.profiles?.length ?? 0
  if (workerProfileCount >= 2) {
    markers.push('multiple_worker_profiles')
    score += 1
  } else {
    markers.push('limited_worker_profile_coverage')
  }

  const memorySampleCount = memorySummary?.sampleCount ?? 0
  if (memorySampleCount >= 20) {
    markers.push('memory_sampling_dense')
    score += 1
  } else if (memorySampleCount >= 6) {
    markers.push('memory_sampling_minimum_met')
    score += 1
  } else if (memorySampleCount > 0) {
    markers.push('memory_sampling_sparse')
  } else {
    markers.push('no_memory_data')
  }

  const memoryDurationSec = (memorySummary?.durationMs ?? 0) / 1000
  if (memoryDurationSec >= 15) {
    markers.push('memory_window_sufficient')
    score += 1
  } else if (memoryDurationSec > 0) {
    markers.push('short_memory_window')
  }

  let confidence = 'low'
  if (score >= 4) confidence = 'high'
  else if (score >= 2) confidence = 'medium'

  return {
    confidence,
    score,
    markers,
    metrics: {
      cpuDurationSec,
      workerProfileCount,
      memorySampleCount,
      memoryDurationSec,
    },
  }
}

const PERF_MATCH_KEYS = [
  'method',
  'iterations',
  'secondsLimit',
  'threadCount',
  'taskCount',
  'memorySampleMs',
]

function extractRunConfig(summary) {
  if (summary == null || typeof summary !== 'object') return null
  if (summary.runConfig && typeof summary.runConfig === 'object') {
    return summary.runConfig
  }
  if (
    summary.memorySummary?.config &&
    typeof summary.memorySummary.config === 'object'
  ) {
    return summary.memorySummary.config
  }
  return null
}

function matchesConfigOnKeys(candidateConfig, currentConfig, keys) {
  if (candidateConfig == null || currentConfig == null) return false
  for (const key of keys) {
    if (currentConfig[key] == null) return false
    if (candidateConfig[key] == null) return false
    if (candidateConfig[key] !== currentConfig[key]) return false
  }
  return true
}

function loadPreviousSummaryByConfig(outputPath, currentRunConfig) {
  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    return {
      status: 'no_artifact_dir',
      previousPath: '',
      previousSummary: null,
      matchKeys: PERF_MATCH_KEYS,
    }
  }

  if (currentRunConfig == null) {
    return {
      status: 'missing_current_run_config',
      previousPath: '',
      previousSummary: null,
      matchKeys: PERF_MATCH_KEYS,
    }
  }

  const currentBase = basename(outputPath)
  const currentDirBase = basename(outputDir)
  const candidatePaths = []

  const localCandidates = readdirSync(outputDir)
    .filter((name) => name.endsWith('.summary.json'))
    .filter((name) => name !== currentBase)
    .sort()
    .map((name) => join(outputDir, name))
  candidatePaths.push(...localCandidates)

  const parentDir = dirname(outputDir)
  if (existsSync(parentDir)) {
    const siblingDirCandidates = readdirSync(parentDir)
      .filter((entry) => entry !== currentDirBase)
      .map((entry) => join(parentDir, entry, 'summary.json'))
      .filter((pathname) => existsSync(pathname))
      .sort()
    candidatePaths.push(...siblingDirCandidates)
  }

  if (candidatePaths.length === 0) {
    return {
      status: 'no_previous_summary',
      previousPath: '',
      previousSummary: null,
      matchKeys: PERF_MATCH_KEYS,
    }
  }

  const ordered = [...new Set(candidatePaths)].sort().reverse()
  for (const previousPath of ordered) {
    const previousSummary = readJsonIfExists(previousPath)
    if (previousSummary == null) continue
    const previousConfig = extractRunConfig(previousSummary)
    if (
      !matchesConfigOnKeys(previousConfig, currentRunConfig, PERF_MATCH_KEYS)
    ) {
      continue
    }
    return {
      status: 'ok',
      previousPath,
      previousSummary,
      matchKeys: PERF_MATCH_KEYS,
    }
  }

  return {
    status: 'no_previous_matching_summary_params',
    previousPath: '',
    previousSummary: null,
    matchKeys: PERF_MATCH_KEYS,
  }
}

function buildDeltaComparison(previousSummary, current) {
  if (previousSummary == null) {
    return {
      status: 'unavailable',
      reason: 'no_previous_summary',
    }
  }

  const prevMainMs = previousSummary.totalMs ?? null
  const prevWorkerMs = previousSummary.workerCpuSummary?.totalMs ?? null
  const prevMemory = previousSummary.memorySummary ?? null

  const deltaMainMs =
    prevMainMs == null ? null : current.mainTotalMs - prevMainMs
  const deltaWorkerMs =
    prevWorkerMs == null || current.workerTotalMs == null
      ? null
      : current.workerTotalMs - prevWorkerMs
  const deltaRssMB =
    prevMemory == null || current.memorySummary == null
      ? null
      : current.memorySummary.delta.rssMB - prevMemory.delta.rssMB
  const deltaHeapUsedMB =
    prevMemory == null || current.memorySummary == null
      ? null
      : current.memorySummary.delta.heapUsedMB - prevMemory.delta.heapUsedMB

  return {
    status: 'ok',
    previousPath: current.previousPath,
    main: {
      previousMs: prevMainMs,
      currentMs: current.mainTotalMs,
      deltaMs: deltaMainMs,
      deltaPct:
        prevMainMs == null
          ? null
          : (deltaMainMs / Math.max(prevMainMs, 1)) * 100,
    },
    worker: {
      previousMs: prevWorkerMs,
      currentMs: current.workerTotalMs,
      deltaMs: deltaWorkerMs,
      deltaPct:
        prevWorkerMs == null || deltaWorkerMs == null
          ? null
          : (deltaWorkerMs / Math.max(prevWorkerMs, 1)) * 100,
    },
    memory: {
      previousDeltaRssMB: prevMemory?.delta?.rssMB ?? null,
      currentDeltaRssMB: current.memorySummary?.delta?.rssMB ?? null,
      deltaRssMB,
      previousDeltaHeapUsedMB: prevMemory?.delta?.heapUsedMB ?? null,
      currentDeltaHeapUsedMB: current.memorySummary?.delta?.heapUsedMB ?? null,
      deltaHeapUsedMB,
    },
  }
}

function fmtNum(value) {
  if (value == null || Number.isNaN(value)) return 'n/a'
  return Number(value.toFixed(2))
}

function run() {
  const options = parseArgs(process.argv.slice(2))
  const content = readFileSync(options.profilePath, 'utf8')
  const profile = parseCpuprofileContent(content)
  const analyzedMain = analyzeCpuprofileDetailed(profile)
  const sortedMain = filterAndSortRows(
    analyzedMain.rows,
    options,
    analyzedMain.totalMs
  )
  const topMainRows = sortedMain.rows.slice(0, options.top)

  if (options.verboseReport) {
    console.log(`Analyzed: ${options.profilePath}`)
    console.log(`Total sampled time: ${sortedMain.totalMs.toFixed(1)} ms`)
    console.table(formatTopRows(topMainRows, sortedMain.totalMs))
  }

  const defaults = deriveDefaultArtifactPaths(options.profilePath)
  const outputPath = options.summaryPath || defaults.summaryPath

  const defaultMemorySummaryPath = defaults.memoryPath
  const resolvedMemorySummaryPath =
    options.memorySummaryPath || resolveInputPath(defaultMemorySummaryPath)
  const rawMemorySummary = readJsonIfExists(resolvedMemorySummaryPath)
  if (rawMemorySummary != null) {
    rawMemorySummary.path = resolvedMemorySummaryPath
  }
  const currentRunConfig =
    rawMemorySummary?.config && typeof rawMemorySummary.config === 'object'
      ? rawMemorySummary.config
      : null
  const memorySummary = summarizeMemory(rawMemorySummary)

  const defaultWorkerCpuProfileDir = defaults.workerDir
  const resolvedWorkerCpuProfileDir =
    options.workerCpuProfileDir || resolveInputPath(defaultWorkerCpuProfileDir)

  let workerCpuSummary = null
  let sortedWorkerRows = []
  let workerNodeRows = []
  if (!options.noWorkerProfile && existsSync(resolvedWorkerCpuProfileDir)) {
    const excluded = new Set(options.excludeWorkerProfiles)
    const workerProfilePaths = readdirSync(resolvedWorkerCpuProfileDir)
      .filter((name) => name.endsWith('.cpuprofile'))
      .filter((name) => !excluded.has(name))
      .sort()
      .map((name) => join(resolvedWorkerCpuProfileDir, name))

    if (workerProfilePaths.length > 0) {
      const aggregateByFunction = new Map()
      let workerTotalMs = 0

      for (const pathname of workerProfilePaths) {
        const workerContent = readFileSync(pathname, 'utf8')
        const workerProfile = parseCpuprofileContent(workerContent)
        const analyzedWorker = analyzeCpuprofileDetailed(workerProfile)
        workerTotalMs += analyzedWorker.totalMs
        workerNodeRows = workerNodeRows.concat(analyzedWorker.nodeRows)

        for (const row of analyzedWorker.rows) {
          const current = aggregateByFunction.get(row.key) || {
            function: row.function,
            sourcePath: row.sourcePath,
            key: row.key,
            selfSamples: 0,
            selfMs: 0,
            totalSamples: 0,
            totalMs: 0,
          }
          current.selfSamples += row.selfSamples
          current.selfMs += row.selfMs
          current.totalSamples += row.totalSamples
          current.totalMs += row.totalMs
          aggregateByFunction.set(row.key, current)
        }
      }

      const workerRows = [...aggregateByFunction.values()]
      const sortedWorker = filterAndSortRows(workerRows, options, workerTotalMs)
      sortedWorkerRows = sortedWorker.rows
      const topWorkerRows = sortedWorker.rows.slice(0, options.top)

      if (options.verboseReport) {
        console.log(`Worker CPU profiles: ${resolvedWorkerCpuProfileDir}`)
        console.log(
          `Aggregated worker sampled time: ${sortedWorker.totalMs.toFixed(1)} ms`
        )
        console.table(formatTopRows(topWorkerRows, sortedWorker.totalMs))
      }

      workerCpuSummary = {
        path: resolvedWorkerCpuProfileDir,
        profiles: workerProfilePaths,
        totalMs: sortedWorker.totalMs,
        top: topWorkerRows,
      }
    }
  }

  const bottleneckBasis = workerNodeRows.length > 0 ? 'worker' : 'main'
  const bottleneckRows =
    workerNodeRows.length > 0 ? workerNodeRows : analyzedMain.nodeRows
  const bottleneckTotalMs =
    workerNodeRows.length > 0
      ? (workerCpuSummary?.totalMs ?? sortedMain.totalMs)
      : sortedMain.totalMs
  const bottleneckBranches = {
    basedOn: bottleneckBasis,
    ...buildBottleneckBranches(
      bottleneckRows,
      bottleneckTotalMs,
      options,
      options.branchTop
    ),
  }

  const hotspotSummary = buildHotspotSummary(
    sortedMain.rows,
    sortedWorkerRows,
    sortedMain.totalMs,
    workerCpuSummary?.totalMs ?? 0
  )

  const confidenceSummary = buildConfidenceSummary(
    sortedMain.totalMs,
    workerCpuSummary,
    memorySummary
  )

  const previous = loadPreviousSummaryByConfig(outputPath, currentRunConfig)
  const deltaComparison =
    previous.status === 'ok'
      ? buildDeltaComparison(previous.previousSummary, {
          mainTotalMs: sortedMain.totalMs,
          workerTotalMs: workerCpuSummary?.totalMs ?? null,
          memorySummary,
          previousPath: previous.previousPath,
        })
      : {
          status: 'unavailable',
          reason: previous.status,
        }

  const summaryPayload = {
    profilePath: options.profilePath,
    runConfig: currentRunConfig,
    totalMs: sortedMain.totalMs,
    top: topMainRows,
    workerCpuSummary,
    bottleneckBranches,
    memorySummary,
    phaseMemory: memorySummary?.phases ?? [],
    hotspots: hotspotSummary,
    confidence: confidenceSummary,
    deltaComparison,
  }

  writeFileSync(outputPath, JSON.stringify(summaryPayload, null, 2))

  if (memorySummary != null) {
    console.log(
      `Memory: ${memorySummary.assessment.join(', ')} (samples=${memorySummary.sampleCount})`
    )
    console.table([
      {
        Metric: 'RSS MB',
        Delta: Number(memorySummary.delta.rssMB.toFixed(2)),
        'Delta MB/s': Number(memorySummary.delta.rssMBPerSec.toFixed(2)),
        Max: Number(memorySummary.max.rssMB.toFixed(2)),
      },
      {
        Metric: 'Heap Used MB',
        Delta: Number(memorySummary.delta.heapUsedMB.toFixed(2)),
        'Delta MB/s': Number(memorySummary.delta.heapUsedMBPerSec.toFixed(2)),
        Max: Number(memorySummary.max.heapUsedMB.toFixed(2)),
      },
      {
        Metric: 'Heap Total MB',
        Delta: Number(memorySummary.delta.heapTotalMB.toFixed(2)),
        'Delta MB/s': Number(memorySummary.delta.heapTotalMBPerSec.toFixed(2)),
        Max: Number(memorySummary.max.heapTotalMB.toFixed(2)),
      },
    ])
    if (options.verboseReport) {
      console.log(`Memory summary path: ${resolvedMemorySummaryPath}`)
      console.table(
        (memorySummary.phases || []).map((phase) => ({
          Phase: phase.phase,
          'Duration ms': Number(phase.durationMs.toFixed(0)),
          'RSS MB/s': Number(phase.delta.rssMBPerSec.toFixed(2)),
          'Heap Used MB/s': Number(phase.delta.heapUsedMBPerSec.toFixed(2)),
          'Heap Total MB/s': Number(phase.delta.heapTotalMBPerSec.toFixed(2)),
        }))
      )
      console.log(
        `Confidence: ${confidenceSummary.confidence} (score=${confidenceSummary.score}) [${confidenceSummary.markers.join(', ')}]`
      )
    }
  }

  console.log(
    `Top bottleneck branches (${bottleneckBranches.basedOn}, showing ${bottleneckBranches.selected}/${bottleneckBranches.candidates}):`
  )
  if (currentRunConfig != null) {
    console.log(
      `Run config: ${JSON.stringify(
        PERF_MATCH_KEYS.reduce((acc, key) => {
          acc[key] = currentRunConfig[key]
          return acc
        }, {})
      )}`
    )
  }
  console.table(
    bottleneckBranches.branches.map((row, index) => ({
      '#': index + 1,
      Bottleneck: row.function,
      'Self ms': Number(row.selfMs.toFixed(2)),
      'Self %': Number((row.selfPctOfProfile * 100).toFixed(2)),
      'Exclusive % of branch': Number((row.exclusivePct * 100).toFixed(1)),
      'Delegated %': Number((row.delegatedPct * 100).toFixed(1)),
      'Largest child %': Number((row.maxChildPct * 100).toFixed(1)),
      'Call Stack Signature': row.branch,
    }))
  )

  if (options.verboseReport) {
    console.log('Package hotspots (secondary):')
    console.table(
      hotspotSummary.packageHotspots.slice(0, 8).map((row) => ({
        Package: row.package,
        'Self ms': Number(row.selfMs.toFixed(2)),
        'Self %': Number(row.selfPct.toFixed(2)),
        'Total ms': Number(row.totalMs.toFixed(2)),
        Impact: row.estimatedImpact,
      }))
    )
  }

  if (deltaComparison.status === 'ok') {
    console.log(`Baseline comparison: ${deltaComparison.previousPath}`)
    console.table([
      {
        Metric: 'Main CPU ms',
        Previous: fmtNum(deltaComparison.main.previousMs),
        Current: fmtNum(deltaComparison.main.currentMs),
        Delta: fmtNum(deltaComparison.main.deltaMs),
        'Delta %': fmtNum(deltaComparison.main.deltaPct),
      },
      {
        Metric: 'Worker CPU ms',
        Previous: fmtNum(deltaComparison.worker.previousMs),
        Current: fmtNum(deltaComparison.worker.currentMs),
        Delta: fmtNum(deltaComparison.worker.deltaMs),
        'Delta %': fmtNum(deltaComparison.worker.deltaPct),
      },
      {
        Metric: 'Memory delta RSS MB',
        Previous: fmtNum(deltaComparison.memory.previousDeltaRssMB),
        Current: fmtNum(deltaComparison.memory.currentDeltaRssMB),
        Delta: fmtNum(deltaComparison.memory.deltaRssMB),
        'Delta %': 'n/a',
      },
      {
        Metric: 'Memory delta HeapUsed MB',
        Previous: fmtNum(deltaComparison.memory.previousDeltaHeapUsedMB),
        Current: fmtNum(deltaComparison.memory.currentDeltaHeapUsedMB),
        Delta: fmtNum(deltaComparison.memory.deltaHeapUsedMB),
        'Delta %': 'n/a',
      },
    ])
  } else {
    console.log(
      `Baseline comparison unavailable: ${deltaComparison.reason} (match keys: ${PERF_MATCH_KEYS.join(', ')})`
    )
  }

  console.log(`Summary written: ${outputPath}`)
}

run()
