/**
 * DES-HyperNEAT profiling script — measures wall-clock timing, memory usage,
 * and optionally captures a V8 CPU profile.
 *
 * Usage:
 *   yarn workspace @neat-evolution/demo profile:des [--iterations N] [--seconds N] [--method NAME] [--output PATH]
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { Session } from 'node:inspector'
import { join, relative } from 'node:path'

import { Activation, defaultNEATConfigOptions } from '@neat-evolution/core'
import { setThreadRNGSeed } from '@neat-evolution/utils'
import {
  DatasetEnvironment,
  type DatasetOptions,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import {
  DESHyperNEATAlgorithm,
  defaultDESHyperNEATGenomeOptions,
  defaultTopologyConfigOptions,
} from '@neat-evolution/des-hyperneat'
import {
  defaultESHyperNEATGenomeOptions,
  ESHyperNEATAlgorithm,
  reportCacheStats,
} from '@neat-evolution/es-hyperneat'
import type { AnyAlgorithm } from '@neat-evolution/evaluator'
import { UnsafeTestEvaluator } from '@neat-evolution/evaluator'
import {
  createReproducer,
  defaultEvolutionOptions,
  defaultPopulationOptions,
  evolve,
} from '@neat-evolution/evolution'
import {
  EvolutionManager,
  type EvolutionManagerOptions,
} from '@neat-evolution/evolution-manager'
import {
  defaultHyperNEATGenomeOptions,
  HyperNEATAlgorithm,
} from '@neat-evolution/hyperneat'

// --- Constants ---

const RUNTIME_NAMES = new Set(['(idle)', '(program)', '(root)', ''])

// --- Argument parsing ---

type MethodName = 'HyperNEAT' | 'ES-HyperNEAT' | 'DES-HyperNEAT'

function parseArgs(argv: string[]) {
  const args = {
    iterations: 50,
    seconds: 0,
    method: 'DES-HyperNEAT' as MethodName,
    output: '',
    analyze: false,
    heap: false,
    lamarckian: false,
    local: false,
    seed: '',
    analyzeDir: '',
    topN: 20,
    threshold: 0.01,
    jsonl: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === '--iterations' && next) {
      args.iterations = Number(next)
      i++
    } else if (arg === '--seconds' && next) {
      args.seconds = Number(next)
      i++
    } else if (arg === '--method' && next) {
      args.method = next as MethodName
      i++
    } else if (arg === '--output' && next) {
      args.output = next
      i++
    } else if (arg === '--analyze') {
      args.analyze = true
    } else if (arg === '--n' && next) {
      args.topN = Number(next)
      i++
    } else if (arg === '--threshold' && next) {
      args.threshold = Number(next)
      i++
    } else if (arg === '--jsonl') {
      args.jsonl = true
    } else if (arg === '--heap') {
      args.heap = true
    } else if (arg === '--lamarckian') {
      args.lamarckian = true
    } else if (arg === '--analyze-dir' && next) {
      args.analyzeDir = next
      i++
    } else if (arg === '--local') {
      args.local = true
    } else if (arg === '--seed' && next) {
      args.seed = next
      i++
    }
  }

  return args
}

const args = parseArgs(process.argv.slice(2))

if (args.seed) {
  setThreadRNGSeed(args.seed)
}

console.log(
  `=== ${args.method} Profiling${args.lamarckian ? ' (Lamarckian)' : ''} ===`
)
console.log(`Iterations: ${args.iterations}`)
if (args.seconds > 0) {
  console.log(`Time limit: ${args.seconds}s`)
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
const environment = new DatasetEnvironment(dataset)

console.log(
  `Dataset: iris (${dataset.trainingCount} train, ${dataset.validationCount} val, ${dataset.testCount} test)`
)
console.log()

// --- Genome options by method ---

const sharedOverrides = {
  hiddenActivation: Activation.Tanh,
  outputActivation: [[3, Activation.Softmax]] as const,
  weightThreshold: 0.1,
}

function getMethodConfig(method: MethodName) {
  switch (method) {
    case 'HyperNEAT':
      return {
        algorithmName: 'HyperNEAT' as const,
        algorithm: HyperNEATAlgorithm,
        genomeOptions: {
          ...defaultHyperNEATGenomeOptions,
          ...sharedOverrides,
          hiddenLayerSizes: [4],
        },
        configData: undefined,
      }
    case 'ES-HyperNEAT':
      return {
        algorithmName: 'ES-HyperNEAT' as const,
        algorithm: ESHyperNEATAlgorithm,
        genomeOptions: {
          ...defaultESHyperNEATGenomeOptions,
          ...sharedOverrides,
        },
        configData: undefined,
      }
    case 'DES-HyperNEAT':
      return {
        algorithmName: 'DES-HyperNEAT' as const,
        algorithm: DESHyperNEATAlgorithm,
        genomeOptions: {
          ...defaultDESHyperNEATGenomeOptions,
          ...sharedOverrides,
        },
        configData: {
          neat: defaultTopologyConfigOptions,
          cppn: defaultNEATConfigOptions,
        },
      }
  }
}

const methodConfig = getMethodConfig(args.method)

// --- CPU profiling ---

const session = new Session()
session.connect()

type SessionPost = (
  m: string,
  p: Record<string, unknown> | undefined,
  cb: (err: Error | null, r?: unknown) => void
) => void

function postSession(
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  return new Promise<unknown>((resolve, reject) => {
    ;(session as unknown as { post: SessionPost }).post(
      method,
      params,
      (err, result) => {
        if (err != null) reject(err)
        else resolve(result)
      }
    )
  })
}

await postSession('Profiler.enable')
await postSession('Profiler.start')
if (args.heap) {
  await postSession('HeapProfiler.enable')
  await postSession('HeapProfiler.startSampling')
}

// --- Run evolution ---

const CREATE_ENVIRONMENT_PATHNAME = '@neat-evolution/dataset-environment'

const fitnessLog: number[] = []
const memBefore = process.memoryUsage()
const startMs = performance.now()

interface TerminableManager {
  terminate(): Promise<void>
}

async function runWithWorkers(): Promise<{
  best: { fitness?: number | null } | null | undefined
  manager: TerminableManager
}> {
  const lamarckianConfig = args.lamarckian
    ? {
        evaluation: {
          options: {
            createExecutorPathname: '@neat-evolution/executor/backprop',
          },
        },
        execution: {
          createExecutionManager: '@neat-evolution/execution-manager/backprop',
          executionManagerFactoryOptions: {
            learningRate: 0.01,
            epochs: 5,
            isLamarckian: true,
          },
        },
      }
    : {}

  const managerOptions: EvolutionManagerOptions = {
    algorithm: {
      name: methodConfig.algorithmName,
      genomeOptions: methodConfig.genomeOptions,
      ...(methodConfig.configData != null
        ? { configData: methodConfig.configData }
        : {}),
    },
    environment: {
      config: environment,
      pathname: CREATE_ENVIRONMENT_PATHNAME,
    },
    population: {
      options: { ...defaultPopulationOptions },
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
    ...lamarckianConfig,
  }

  const mgr = new EvolutionManager(managerOptions)
  const best = await mgr.evolve()
  return { best, manager: mgr }
}

async function runLocal(): Promise<{
  best: { fitness?: number | null } | null | undefined
  manager: TerminableManager
}> {
  const { algorithm } = methodConfig
  const evaluator = new UnsafeTestEvaluator(
    algorithm as unknown as AnyAlgorithm,
    environment,
    { unsafeLocalEvaluation: true }
  )
  await evaluator.initGenomeFactory()

  const population = algorithm.createPopulation(
    createReproducer as never,
    evaluator as never,
    (methodConfig.configData ?? undefined) as never,
    { ...defaultPopulationOptions },
    methodConfig.genomeOptions as never,
    undefined as never
  )

  const evolutionOptions = {
    ...defaultEvolutionOptions,
    iterations: args.iterations,
    secondsLimit: args.seconds,
    quiet: true,
    afterEvaluate: () => {
      const best = population.best()
      fitnessLog.push(best?.fitness ?? 0)
    },
  }

  await evolve(population as never, evolutionOptions as never)
  const best = population.best()
  return { best, manager: { terminate: async () => {} } }
}

const { best, manager } = args.local ? await runLocal() : await runWithWorkers()

try {
  const elapsedMs = performance.now() - startMs
  const memAfter = process.memoryUsage()

  // --- Stop profiling ---

  const stopResult = await postSession('Profiler.stop')
  const profile = (stopResult as { profile: unknown }).profile
  await postSession('Profiler.disable')

  let heapProfile: unknown | undefined
  if (args.heap) {
    const heapStopResult = await postSession('HeapProfiler.stopSampling')
    heapProfile = (heapStopResult as { profile: unknown }).profile
    await postSession('HeapProfiler.disable')
  }

  session.disconnect()

  // --- Write .cpuprofile ---

  const outputDir =
    args.output ||
    join(
      new URL('../../../../../.artifacts/cpuprofiles', import.meta.url).pathname
    )
  await mkdir(outputDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const profilePath = join(
    outputDir,
    `${args.method.toLowerCase()}-${timestamp}.cpuprofile`
  )
  await writeFile(profilePath, JSON.stringify(profile))

  // --- Summary ---

  const totalIters = fitnessLog.length
  const msPerIter = totalIters > 0 ? elapsedMs / totalIters : 0

  console.log('=== Results ===')
  console.log(`Method:      ${args.method}`)
  console.log(`Iterations:  ${totalIters}`)
  console.log(`Total time:  ${(elapsedMs / 1000).toFixed(2)}s`)
  console.log(`Per iter:    ${msPerIter.toFixed(1)}ms`)
  console.log(`Best:        ${best?.fitness?.toFixed(6) ?? 'N/A'}`)
  console.log()
  console.log('=== Memory Delta ===')
  console.log(
    `RSS:         ${formatBytes(memAfter.rss - memBefore.rss)} (${formatBytes(memAfter.rss)} total)`
  )
  console.log(
    `Heap used:   ${formatBytes(memAfter.heapUsed - memBefore.heapUsed)} (${formatBytes(memAfter.heapUsed)} total)`
  )
  console.log(
    `Heap total:  ${formatBytes(memAfter.heapTotal - memBefore.heapTotal)} (${formatBytes(memAfter.heapTotal)} total)`
  )
  console.log()
  console.log(`CPU profile: ${profilePath}`)

  // Report CPPN query cache stats
  const cacheStats = reportCacheStats()
  if (cacheStats.calls > 0) {
    console.log()
    console.log('=== CPPN Query Cache ===')
    console.log(`Calls:           ${cacheStats.calls}`)
    console.log(`Total queries:   ${cacheStats.totalQueries}`)
    console.log(`Cache hits:      ${cacheStats.cacheHits}`)
    console.log(
      `Hit rate:        ${(cacheStats.hitRate * 100).toFixed(1)}%`
    )
    console.log(`Saved forwards:  ${cacheStats.savedForwardCalls}`)
  }

  if (heapProfile !== undefined) {
    const heapPath = join(
      outputDir,
      `${args.method.toLowerCase()}-${timestamp}.heapprofile`
    )
    await writeFile(heapPath, JSON.stringify(heapProfile))
    console.log(`Heap profile: ${heapPath}`)
  }

  // --- Inline analysis ---

  if (args.analyze) {
    console.log()
    const profileJson = await readFile(profilePath, 'utf8')
    analyzeProfile(profileJson, args.topN, args.threshold)
  }

  if (args.heap && heapProfile !== undefined) {
    console.log()
    analyzeHeapProfile(JSON.stringify(heapProfile), args.topN, args.threshold)
  }

  // --- Analyze worker profiles from --analyze-dir ---

  if (args.analyzeDir) {
    const { readdirSync, readFileSync } = await import('node:fs')
    const dirFiles = readdirSync(args.analyzeDir).sort()
    const cpuFiles = dirFiles.filter((f: string) => f.endsWith('.cpuprofile'))
    const heapFiles = dirFiles.filter((f: string) => f.endsWith('.heapprofile'))

    for (const file of cpuFiles) {
      console.log()
      console.log(`=== CPU: ${file} ===`)
      const content = readFileSync(join(args.analyzeDir, file), 'utf8')
      analyzeProfile(content, args.topN, args.threshold)
    }
    for (const file of heapFiles) {
      console.log()
      console.log(`=== Heap: ${file} ===`)
      const content = readFileSync(join(args.analyzeDir, file), 'utf8')
      analyzeHeapProfile(content, args.topN, args.threshold)
    }
  }
} finally {
  await manager.terminate()
}

// --- Profile analysis ---

interface ProfileCallFrame {
  functionName: string
  url: string
  lineNumber: number
  columnNumber: number
}

interface ProfileNode {
  id: number
  callFrame: ProfileCallFrame
  children?: number[]
}

interface CpuProfile {
  nodes: ProfileNode[]
  samples: number[]
  timeDeltas: number[]
}

interface NodeMetrics {
  id: number
  callFrame: ProfileCallFrame
  selfUs: number
  totalUs: number
  childTotals: Map<number, number>
}

type BottleneckKind =
  | 'leaf'
  | 'hot-loop'
  | 'gc-pressure'
  | 'serialization'
  | 'mixed'

interface BottleneckRecord {
  rank: number
  kind: BottleneckKind
  function: string
  file: string
  line: number
  selfMs: number
  totalMs: number
  selfPct: number
  totalPct: number
  exclusivePct: number
  maxChildPct: number
  score: number
  callPaths: string[][]
  children: Array<{ function: string; totalMs: number; pct: number }>
}

/** Map dist paths back to source .ts files and make repo-relative. */
function normalizeFilePath(url: string): string {
  if (!url) return ''
  let p = url
  if (p.startsWith('file://')) {
    p = p.slice(7)
  }
  // Make repo-relative
  const packagesIndex = p.indexOf('packages/')
  if (packagesIndex >= 0) {
    p = p.slice(packagesIndex)
  } else {
    try {
      p = relative(process.cwd(), p)
    } catch {
      // keep as-is
    }
  }
  // Map dist/esm/*.js and dist/cjs/*.js back to src/*.ts
  p = p.replace(/\/dist\/(?:esm|cjs)\//, '/src/')
  p = p.replace(/\.js$/, '.ts')
  return p
}

function classifyKind(
  fn: string,
  exclusivePct: number,
  childCount: number
): BottleneckKind {
  if (fn === '(garbage collector)') return 'gc-pressure'
  if (fn === 'postMessage' || fn === 'structuredClone') return 'serialization'
  if (exclusivePct >= 0.8) return 'leaf'
  if (exclusivePct >= 0.25 && childCount > 0) return 'hot-loop'
  return 'mixed'
}

/** Build a function+file aggregation key. */
function functionKey(callFrame: ProfileCallFrame): string {
  return `${callFrame.functionName}|${callFrame.url}|${callFrame.lineNumber}`
}

function analyzeProfile(
  profileJson: string,
  topN: number,
  threshold: number
): void {
  const profile: CpuProfile = JSON.parse(profileJson)
  const { nodes, samples, timeDeltas } = profile

  // Build maps
  const nodeById = new Map<number, ProfileNode>()
  const parentById = new Map<number, number>()
  for (const node of nodes) {
    nodeById.set(node.id, node)
    if (node.children) {
      for (const childId of node.children) {
        parentById.set(childId, node.id)
      }
    }
  }

  // Accumulate per-node times
  const metrics = new Map<number, NodeMetrics>()
  function getMetrics(id: number): NodeMetrics {
    let m = metrics.get(id)
    if (m) return m
    const node = nodeById.get(id)
    const callFrame = node
      ? node.callFrame
      : { functionName: '', url: '', lineNumber: 0, columnNumber: 0 }
    m = { id, callFrame, selfUs: 0, totalUs: 0, childTotals: new Map() }
    metrics.set(id, m)
    return m
  }

  let totalUs = 0
  for (let i = 0; i < samples.length; i++) {
    const leafId = samples[i]
    if (leafId === undefined) continue
    const deltaUs = timeDeltas[i] ?? 0
    totalUs += deltaUs

    const leafMetrics = getMetrics(leafId)
    leafMetrics.selfUs += deltaUs

    let currentId: number | undefined = leafId
    while (currentId !== undefined) {
      const m = getMetrics(currentId)
      m.totalUs += deltaUs
      currentId = parentById.get(currentId)
    }
  }

  // Build child totals per parent
  for (const [childId, parentId] of parentById) {
    const childMetrics = metrics.get(childId)
    if (!childMetrics || childMetrics.totalUs <= 0) continue
    const parentMetrics = metrics.get(parentId)
    if (!parentMetrics) continue
    const existing = parentMetrics.childTotals.get(childId) ?? 0
    parentMetrics.childTotals.set(childId, existing + childMetrics.totalUs)
  }

  const totalMs = totalUs / 1000

  // --- Aggregate by function+file ---
  // Multiple V8 nodes can represent the same function from different call paths.
  // We merge them into one record and collect all distinct call paths.

  interface FunctionAggregate {
    callFrame: ProfileCallFrame
    selfUs: number
    totalUs: number
    /** Merged child totals keyed by child function key */
    childByFunction: Map<string, { name: string; totalUs: number }>
    /** Distinct call paths (each is root-to-this, function names only) */
    callPaths: string[][]
  }

  const aggregates = new Map<string, FunctionAggregate>()

  for (const m of metrics.values()) {
    const fn = m.callFrame.functionName
    if (RUNTIME_NAMES.has(fn) && fn !== '(garbage collector)') continue

    const key = functionKey(m.callFrame)
    let agg = aggregates.get(key)
    if (!agg) {
      agg = {
        callFrame: m.callFrame,
        selfUs: 0,
        totalUs: 0,
        childByFunction: new Map(),
        callPaths: [],
      }
      aggregates.set(key, agg)
    }

    agg.selfUs += m.selfUs
    // Sum totalUs across nodes. Each V8 node is a distinct position in the
    // call tree — its total time is the time spent in that subtree, which
    // doesn't overlap with other nodes for the same function.
    agg.totalUs += m.totalUs

    // Merge children
    for (const [childId, childUs] of m.childTotals) {
      const childNode = nodeById.get(childId)
      if (!childNode) continue
      const childName = childNode.callFrame.functionName
      if (!childName || RUNTIME_NAMES.has(childName)) continue
      const childKey = functionKey(childNode.callFrame)
      const existing = agg.childByFunction.get(childKey)
      if (existing) {
        existing.totalUs += childUs
      } else {
        agg.childByFunction.set(childKey, {
          name: childName,
          totalUs: childUs,
        })
      }
    }

    // Build call path for this node
    const path: string[] = []
    let walkId: number | undefined = m.id
    while (walkId !== undefined) {
      const node = nodeById.get(walkId)
      if (node) {
        const name = node.callFrame.functionName
        if (!RUNTIME_NAMES.has(name)) {
          path.unshift(name)
        }
      }
      walkId = parentById.get(walkId)
    }
    // Deduplicate call paths (keep up to 3)
    if (
      agg.callPaths.length < 3 &&
      !agg.callPaths.some((p) => p.join('->') === path.join('->'))
    ) {
      agg.callPaths.push(path)
    }
  }

  // --- Build bottleneck records from aggregates ---
  const records: BottleneckRecord[] = []

  for (const agg of aggregates.values()) {
    const fn = agg.callFrame.functionName
    const selfMs = agg.selfUs / 1000
    const aggTotalMs = agg.totalUs / 1000
    const selfPct = selfMs / Math.max(totalMs, 1)
    const totalPct = aggTotalMs / Math.max(totalMs, 1)

    // Threshold: skip functions below minimum totalPct
    if (totalPct < threshold) continue

    const exclusivePct = aggTotalMs > 0 ? selfMs / aggTotalMs : 0

    // Core filter: skip functions where self time is negligible.
    // If a function spends <5% of its time doing its own work, the real
    // bottleneck is in a child — this function is just a call-chain breadcrumb.
    // Exception: GC which is always 100% self-time.
    const isGc = fn === '(garbage collector)'
    if (!isGc && (selfMs < 0.5 || exclusivePct < 0.05)) continue

    // Build sorted children
    const childEntries: Array<{
      function: string
      totalMs: number
      pct: number
    }> = []
    for (const child of agg.childByFunction.values()) {
      const childTotalMs = child.totalUs / 1000
      childEntries.push({
        function: child.name,
        totalMs: round2(childTotalMs),
        pct: round3(aggTotalMs > 0 ? childTotalMs / aggTotalMs : 0),
      })
    }
    childEntries.sort((a, b) => b.totalMs - a.totalMs)

    // Max child percent
    const maxChildPct =
      childEntries.length > 0 && aggTotalMs > 0
        ? (childEntries[0]?.totalMs ?? 0) / aggTotalMs
        : 0

    // Score: selfMs * (0.35 + exclusivePct)
    const score = selfMs * (0.35 + exclusivePct)

    const kind = classifyKind(fn, exclusivePct, childEntries.length)

    records.push({
      rank: 0,
      kind,
      function: fn,
      file: normalizeFilePath(agg.callFrame.url),
      line: agg.callFrame.lineNumber + 1,
      selfMs: round2(selfMs),
      totalMs: round2(aggTotalMs),
      selfPct: round3(selfPct),
      totalPct: round3(totalPct),
      exclusivePct: round3(exclusivePct),
      maxChildPct: round3(maxChildPct),
      score: round1(score),
      callPaths: agg.callPaths,
      children: childEntries.slice(0, 5),
    })
  }

  // Sort by score descending — surfaces where optimization effort pays off
  records.sort((a, b) => b.score - a.score)
  const topRecords = records.slice(0, topN)

  for (let i = 0; i < topRecords.length; i++) {
    const record = topRecords[i]
    if (!record) continue
    record.rank = i + 1
    console.log(JSON.stringify(record))
  }
}

// --- Heap profile analysis ---

interface HeapNode {
  callFrame: ProfileCallFrame
  selfSize: number
  id: number
  children?: HeapNode[]
}

interface HeapProfile {
  head: HeapNode
}

type HeapKind = 'alloc-leaf' | 'alloc-tree' | 'builtin' | 'mixed'

interface HeapRecord {
  rank: number
  kind: HeapKind
  function: string
  file: string
  line: number
  selfKB: number
  totalKB: number
  selfPct: number
  totalPct: number
  exclusivePct: number
  score: number
  callPaths: string[][]
  children: Array<{ function: string; totalKB: number; pct: number }>
}

function classifyHeapKind(
  fn: string,
  file: string,
  exclusivePct: number,
  childCount: number
): HeapKind {
  if (
    !file &&
    (fn === 'Map' ||
      fn === 'Set' ||
      fn === 'set' ||
      fn === 'add' ||
      fn === 'get' ||
      fn === 'next' ||
      fn === 'delete' ||
      fn === '(V8 API)')
  ) {
    return 'builtin'
  }
  if (exclusivePct >= 0.8) return 'alloc-leaf'
  if (childCount > 0 && exclusivePct >= 0.1) return 'alloc-tree'
  return 'mixed'
}

function analyzeHeapProfile(
  profileJson: string,
  topN: number,
  threshold: number
): void {
  const profile: HeapProfile = JSON.parse(profileJson)

  // Walk the tree: compute totalSize (self + all descendants) for each node,
  // then aggregate by function+file.

  interface HeapMetrics {
    callFrame: ProfileCallFrame
    selfBytes: number
    totalBytes: number
    /** child function key → total bytes */
    childByFunction: Map<string, { name: string; totalBytes: number }>
    callPaths: string[][]
  }

  const aggregates = new Map<string, HeapMetrics>()
  let grandTotal = 0

  // Recursive walk returns totalBytes for the subtree
  function walk(node: HeapNode, pathSoFar: string[]): number {
    const fn = node.callFrame.functionName || ''
    const skipName = fn === '(root)'

    // Build path for this node
    const path = skipName ? pathSoFar : [...pathSoFar, fn]

    // Recurse children first to compute their totals
    let childrenTotal = 0
    const childTotals = new Map<string, { name: string; totalBytes: number }>()

    if (node.children) {
      for (const child of node.children) {
        const childTotal = walk(child, path)
        childrenTotal += childTotal

        const childFn = child.callFrame.functionName || '(anonymous)'
        const childKey = functionKey(child.callFrame)
        const existing = childTotals.get(childKey)
        if (existing) {
          existing.totalBytes += childTotal
        } else {
          childTotals.set(childKey, { name: childFn, totalBytes: childTotal })
        }
      }
    }

    const selfBytes = node.selfSize || 0
    const totalBytes = selfBytes + childrenTotal
    grandTotal += selfBytes

    if (skipName || totalBytes === 0) return totalBytes

    // Aggregate by function+file
    const key = functionKey(node.callFrame)
    let agg = aggregates.get(key)
    if (!agg) {
      agg = {
        callFrame: node.callFrame,
        selfBytes: 0,
        totalBytes: 0,
        childByFunction: new Map(),
        callPaths: [],
      }
      aggregates.set(key, agg)
    }

    agg.selfBytes += selfBytes
    agg.totalBytes += totalBytes

    // Merge children
    for (const [childKey, childInfo] of childTotals) {
      const existing = agg.childByFunction.get(childKey)
      if (existing) {
        existing.totalBytes += childInfo.totalBytes
      } else {
        agg.childByFunction.set(childKey, { ...childInfo })
      }
    }

    // Keep up to 3 distinct call paths (trim to last 6 for readability)
    const trimmedPath = path.length > 6 ? path.slice(-6) : path
    if (
      agg.callPaths.length < 3 &&
      !agg.callPaths.some((p) => p.join('->') === trimmedPath.join('->'))
    ) {
      agg.callPaths.push(trimmedPath)
    }

    return totalBytes
  }

  walk(profile.head, [])

  // Build records
  const records: HeapRecord[] = []

  for (const agg of aggregates.values()) {
    const fn = agg.callFrame.functionName || '(anonymous)'
    if (RUNTIME_NAMES.has(fn)) continue

    const selfKB = agg.selfBytes / 1024
    const totalKB = agg.totalBytes / 1024
    const grandTotalKB = grandTotal / 1024
    const selfPct = selfKB / Math.max(grandTotalKB, 1)
    const totalPct = totalKB / Math.max(grandTotalKB, 1)

    if (totalPct < threshold) continue
    // Filter noise: skip entries with < 1KB self allocation
    if (selfKB < 1 && totalKB < 32) continue

    const exclusivePct = totalKB > 0 ? selfKB / totalKB : 0

    // Build sorted children
    const childEntries: Array<{
      function: string
      totalKB: number
      pct: number
    }> = []
    for (const child of agg.childByFunction.values()) {
      const childKB = child.totalBytes / 1024
      if (childKB < 1) continue
      childEntries.push({
        function: child.name,
        totalKB: round1(childKB),
        pct: round3(totalKB > 0 ? childKB / totalKB : 0),
      })
    }
    childEntries.sort((a, b) => b.totalKB - a.totalKB)

    const file = normalizeFilePath(agg.callFrame.url)
    const kind = classifyHeapKind(fn, file, exclusivePct, childEntries.length)

    // Score: selfKB * (0.35 + exclusivePct) — same formula as CPU, but KB instead of ms
    const score = selfKB * (0.35 + exclusivePct)

    records.push({
      rank: 0,
      kind,
      function: fn,
      file,
      line: agg.callFrame.lineNumber + 1,
      selfKB: round1(selfKB),
      totalKB: round1(totalKB),
      selfPct: round3(selfPct),
      totalPct: round3(totalPct),
      exclusivePct: round3(exclusivePct),
      score: round1(score),
      callPaths: agg.callPaths,
      children: childEntries.slice(0, 5),
    })
  }

  records.sort((a, b) => b.score - a.score)
  const topRecords = records.slice(0, topN)

  for (let i = 0; i < topRecords.length; i++) {
    const record = topRecords[i]
    if (!record) continue
    record.rank = i + 1
    console.log(JSON.stringify(record))
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

function formatBytes(bytes: number): string {
  const sign = bytes < 0 ? '-' : '+'
  const abs = Math.abs(bytes)
  if (abs < 1024) return `${sign}${abs}B`
  if (abs < 1024 * 1024) return `${sign}${(abs / 1024).toFixed(1)}KB`
  return `${sign}${(abs / (1024 * 1024)).toFixed(1)}MB`
}
