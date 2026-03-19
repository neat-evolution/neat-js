/**
 * Diagnostic script: compares DES-HyperNEAT mutation strategies to understand
 * why Darwinian mode stalls. Runs three variants:
 *
 * 1. Default:     mutateAllComponents=true, initialMutations=100
 * 2. Selective:   mutateAllComponents=false, initialMutations=100
 * 3. Low preMut:  mutateAllComponents=true, initialMutations=10
 *
 * For each, logs per-generation: best fitness, empty phenotype %, topology stats.
 *
 * Usage:
 *   yarn workspace @neat-evolution/demo diagnose-des [--iterations N]
 */

import {
  Activation,
  defaultNEATConfigOptions,
  PhenotypeActionType,
} from '@neat-evolution/core'
import {
  DatasetEnvironment,
  type DatasetOptions,
  defaultDatasetOptions,
  loadDataset,
} from '@neat-evolution/dataset-environment'
import {
  createPhenotype,
  type DESHyperNEATGenome,
  defaultDESHyperNEATGenomeOptions,
  defaultTopologyConfigOptions,
} from '@neat-evolution/des-hyperneat'
import {
  defaultEvolutionOptions,
  defaultPopulationOptions,
} from '@neat-evolution/evolution'
import {
  EvolutionManager,
  type EvolutionManagerOptions,
} from '@neat-evolution/evolution-manager'

// --- Args ---

function parseArgs(argv: string[]) {
  const args = { iterations: 30 }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--iterations' && argv[i + 1]) {
      args.iterations = Number(argv[i + 1])
      i++
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

// --- Dataset ---

const datasetOptions: DatasetOptions = {
  ...defaultDatasetOptions,
  dataset: new URL('../../../../generated/iris', import.meta.url).pathname,
  validationFraction: 0.1,
  testFraction: 0.1,
}

const dataset = await loadDataset(datasetOptions)
const environment = new DatasetEnvironment(dataset)

// --- Genome inspection ---

function inspectPopulation(population: {
  best: () => { fitness: number | null; genome: unknown } | null
  organismValues: () => Iterable<{
    fitness: number | null
    genome: unknown
  }>
}) {
  const best = population.best()
  if (best == null) return null

  const genome = best.genome as DESHyperNEATGenome

  // Best genome stats
  const topoLinks = genome.links.size
  const topoHidden = genome.hiddenNodes.size
  const linkCppnSizes: number[] = []
  for (const link of genome.links.values()) {
    linkCppnSizes.push(link.cppn.links.size)
  }

  let bestPhenLinks = 0
  let bestPhenActions = 0
  try {
    const p = createPhenotype(genome)
    bestPhenActions = p.actions.length
    bestPhenLinks = p.actions.filter(
      (a) => a[0] === PhenotypeActionType.Link
    ).length
  } catch (_e) {
    // degenerate
  }

  // Population-wide stats
  let count = 0
  let totalFitness = 0
  let emptyCount = 0
  let totalTopoLinks = 0

  for (const organism of population.organismValues()) {
    count++
    totalFitness += organism.fitness ?? 0
    const g = organism.genome as DESHyperNEATGenome
    totalTopoLinks += g.links.size
    try {
      const p = createPhenotype(g)
      if (p.actions.length === 0) emptyCount++
    } catch (_e) {
      emptyCount++
    }
  }

  return {
    bestFitness: best.fitness ?? 0,
    avgFitness: count > 0 ? totalFitness / count : 0,
    topoLinks,
    topoHidden,
    linkCppnSizes,
    bestPhenActions,
    bestPhenLinks,
    emptyPct: count > 0 ? (emptyCount / count) * 100 : 0,
    avgTopoLinks: count > 0 ? totalTopoLinks / count : 0,
    popSize: count,
  }
}

// --- Shared config ---

const sharedOverrides = {
  hiddenActivation: Activation.Tanh,
  outputActivation: [[3, Activation.Softmax]] as const,
  weightThreshold: 0.1,
}

const desConfigData = {
  neat: defaultTopologyConfigOptions,
  cppn: defaultNEATConfigOptions,
}

const CREATE_ENVIRONMENT_PATHNAME = '@neat-evolution/dataset-environment'

// --- Run one variant ---

type IterRow = ReturnType<typeof inspectPopulation>

interface VariantResult {
  name: string
  rows: Array<NonNullable<IterRow>>
  elapsedMs: number
}

async function runVariant(
  name: string,
  genomeOptions: Record<string, unknown>,
  initialMutations: number
): Promise<VariantResult> {
  const rows: Array<NonNullable<IterRow>> = []

  const managerOptions: EvolutionManagerOptions = {
    algorithm: {
      name: 'DES-HyperNEAT' as const,
      genomeOptions,
      configData: desConfigData,
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
      initialMutations,
      quiet: true,
      afterEvaluate: (population) => {
        const row = inspectPopulation(population)
        if (row != null) rows.push(row)
      },
    },
  }

  const manager = new EvolutionManager(managerOptions)
  const start = performance.now()
  try {
    await manager.evolve()
  } finally {
    await manager.terminate()
  }

  return { name, rows, elapsedMs: performance.now() - start }
}

// --- Run all variants ---

console.log('=== DES-HyperNEAT Mutation Strategy Diagnostic ===')
console.log(`${args.iterations} iterations each`)
console.log()

// New default has enableIdentityMapping=true, which now seeds new topology
// links with identity CPPNs via the mutationAddLink() override.

console.log('Running: Default+identity (preMut=100)...')
const v1 = await runVariant(
  'Identity',
  { ...defaultDESHyperNEATGenomeOptions, ...sharedOverrides },
  100
)
console.log(
  `  Done: ${v1.rows[v1.rows.length - 1]?.bestFitness.toFixed(4)} in ${(v1.elapsedMs / 1000).toFixed(1)}s`
)

console.log('Running: Default+identity (preMut=200)...')
const v2 = await runVariant(
  'Ident+200',
  { ...defaultDESHyperNEATGenomeOptions, ...sharedOverrides },
  200
)
console.log(
  `  Done: ${v2.rows[v2.rows.length - 1]?.bestFitness.toFixed(4)} in ${(v2.elapsedMs / 1000).toFixed(1)}s`
)

console.log('Running: No identity (enableIdentityMapping=false, preMut=100)...')
const v3 = await runVariant(
  'NoIdent',
  {
    ...defaultDESHyperNEATGenomeOptions,
    ...sharedOverrides,
    enableIdentityMapping: false,
  },
  100
)
console.log(
  `  Done: ${v3.rows[v3.rows.length - 1]?.bestFitness.toFixed(4)} in ${(v3.elapsedMs / 1000).toFixed(1)}s`
)

const variants = [v1, v2, v3]

// --- Output comparison table ---

console.log()
console.log('=== Per-Generation Comparison ===')
console.log()

// Print each variant's table
for (const v of variants) {
  console.log(`--- ${v.name} ---`)
  console.log(
    `${'Iter'.padEnd(6)}${'Best'.padStart(10)}${'AvgFit'.padStart(10)}${'TopoLnk'.padStart(9)}${'AvgLnk'.padStart(8)}${'PhenLnk'.padStart(9)}${'Empty%'.padStart(9)}`
  )
  console.log('-'.repeat(61))

  for (let i = 0; i < v.rows.length; i++) {
    const d = v.rows[i]
    if (d == null) continue
    if (i % 5 === 0 || i === v.rows.length - 1) {
      console.log(
        `${String(i).padEnd(6)}${d.bestFitness.toFixed(6).padStart(10)}${d.avgFitness.toFixed(4).padStart(10)}${String(d.topoLinks).padStart(9)}${d.avgTopoLinks.toFixed(1).padStart(8)}${String(d.bestPhenLinks).padStart(9)}${`${d.emptyPct.toFixed(0)}%`.padStart(9)}`
      )
    }
  }
  console.log()
}

// --- Summary ---

console.log('=== Summary ===')
console.log()
console.log(
  `${'Variant'.padEnd(14)}${'BestFit'.padStart(10)}${'AvgEmpty%'.padStart(11)}${'Time'.padStart(8)}`
)
console.log('-'.repeat(43))

for (const v of variants) {
  const lastRow = v.rows[v.rows.length - 1]
  const avgEmpty =
    v.rows.length > 0
      ? v.rows.reduce((s, r) => s + r.emptyPct, 0) / v.rows.length
      : 0
  console.log(
    `${v.name.padEnd(14)}${(lastRow?.bestFitness ?? 0).toFixed(6).padStart(10)}${`${avgEmpty.toFixed(0)}%`.padStart(11)}${`${(v.elapsedMs / 1000).toFixed(1)}s`.padStart(8)}`
  )
}
