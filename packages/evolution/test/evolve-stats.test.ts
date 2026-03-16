import { describe, expect, it } from 'vitest'

import type { EvolutionOptions } from '../src/EvolutionOptions.js'
import { evolve } from '../src/evolve.js'
import type { GenerationRecord } from '../src/records/GenerationRecord.js'
import type { RunSummaryRecord } from '../src/records/RunSummaryRecord.js'

function createMockPopulation(speciesCount = 1, organismsPerSpecies = 5) {
  const organisms = Array.from({ length: organismsPerSpecies }, (_) => ({
    fitness: null as number | null,
    genome: {
      hiddenNodes: new Map([[0, {}]]),
      links: new Map(
        Array.from({ length: 3 }, (__, j) => [j, {}] as [number, unknown])
      ),
    },
  }))

  const species = new Map(
    Array.from({ length: speciesCount }, (__, i) => [
      i,
      { organisms, organismValues: () => organisms },
    ])
  )

  let evaluateCount = 0

  return {
    species,
    extinctSpecies: new Map(),
    async mutate() {},
    async evolve() {},
    async evaluate() {
      evaluateCount++
      for (const o of organisms) {
        o.fitness = evaluateCount * 0.1
      }
    },
    best() {
      let best: (typeof organisms)[number] | undefined
      for (const o of organisms) {
        if (
          best == null ||
          (o.fitness ?? -Infinity) > (best.fitness ?? -Infinity)
        ) {
          best = o
        }
      }
      return best
    },
  }
}

describe('evolve stats recording', () => {
  it('records generation and run-summary', async () => {
    const population = createMockPopulation()
    const recorded: Array<{ metric: string; value: unknown }> = []

    const stats = {
      wants() {
        return true
      },
      record(metric: string, value: unknown) {
        recorded.push({ metric, value })
      },
      toJSON() {
        return { wantedMetrics: ['generation', 'run-summary'] }
      },
    }

    const options: EvolutionOptions = {
      threadCount: 0,
      iterations: 3,
      initialMutations: 0,
      secondsLimit: 0,
      logInterval: 10,
      logTimeIntervalMs: 0,
      earlyStop: false,
      earlyStopPatience: 10,
      earlyStopMinThreshold: 0,
      stats,
    }

    await evolve(population as never, options)

    const generations = recorded.filter((r) => r.metric === 'generation')
    const summaries = recorded.filter((r) => r.metric === 'run-summary')

    expect(generations).toHaveLength(3)
    expect(summaries).toHaveLength(1)

    // Check first generation record shape
    const gen0 = (generations[0] as { value: unknown })
      .value as GenerationRecord
    expect(gen0.iteration).toBe(0)
    expect(gen0.speciesCount).toBe(1)
    expect(gen0.extinctSpeciesCount).toBe(0)
    expect(gen0.hiddenNodes).toBe(1)
    expect(gen0.links).toBe(3)
    expect(gen0.iterationMs).toBeGreaterThanOrEqual(0)
    expect(gen0.totalMs).toBeGreaterThanOrEqual(0)
    expect(gen0.fitness).toBe(0.1)

    // Check iteration numbers increment
    const gen1 = (generations[1] as { value: unknown })
      .value as GenerationRecord
    const gen2 = (generations[2] as { value: unknown })
      .value as GenerationRecord
    expect(gen1.iteration).toBe(1)
    expect(gen2.iteration).toBe(2)

    // Check run summary
    const summary = (summaries[0] as { value: unknown })
      .value as RunSummaryRecord
    expect(summary.totalIterations).toBe(3)
    expect(summary.bestFitness).toBeGreaterThan(0)
    expect(summary.stopReason).toBe('completed')
    expect(summary.totalMs).toBeGreaterThanOrEqual(0)
  })

  it('records early-stop reason', async () => {
    const population = createMockPopulation()
    const recorded: Array<{ metric: string; value: unknown }> = []

    const stats = {
      wants() {
        return true
      },
      record(metric: string, value: unknown) {
        recorded.push({ metric, value })
      },
      toJSON() {
        return { wantedMetrics: ['generation', 'run-summary'] }
      },
    }

    // Make fitness decrease after first iteration so early stop triggers
    let evalCount = 0
    population.evaluate = async () => {
      evalCount++
      const fitness = evalCount === 1 ? 0.5 : 0.3
      const speciesEntry = population.species.get(0)
      if (speciesEntry == null) return
      for (const o of speciesEntry.organisms) {
        o.fitness = fitness
      }
    }

    const options: EvolutionOptions = {
      threadCount: 0,
      iterations: 100,
      initialMutations: 0,
      secondsLimit: 0,
      logInterval: 10,
      logTimeIntervalMs: 0,
      earlyStop: true,
      earlyStopPatience: 1,
      earlyStopMinThreshold: 0,
      stats,
    }

    await evolve(population as never, options)

    const summaries = recorded.filter((r) => r.metric === 'run-summary')
    expect(summaries).toHaveLength(1)

    const summary = (summaries[0] as { value: unknown })
      .value as RunSummaryRecord
    expect(summary.stopReason).toBe('early-stop')
  })

  it('records aborted reason', async () => {
    const population = createMockPopulation()
    const recorded: Array<{ metric: string; value: unknown }> = []

    const stats = {
      wants() {
        return true
      },
      record(metric: string, value: unknown) {
        recorded.push({ metric, value })
      },
      toJSON() {
        return { wantedMetrics: ['generation', 'run-summary'] }
      },
    }

    const controller = new AbortController()
    controller.abort()

    const options: EvolutionOptions = {
      threadCount: 0,
      iterations: 10,
      initialMutations: 0,
      secondsLimit: 0,
      logInterval: 10,
      logTimeIntervalMs: 0,
      earlyStop: false,
      earlyStopPatience: 10,
      earlyStopMinThreshold: 0,
      stats,
      signal: controller.signal,
    }

    await evolve(population as never, options)

    const summaries = recorded.filter((r) => r.metric === 'run-summary')
    expect(summaries).toHaveLength(1)

    const summary = (summaries[0] as { value: unknown })
      .value as RunSummaryRecord
    expect(summary.stopReason).toBe('aborted')
    expect(summary.totalIterations).toBe(0)
  })

  it('does not record when stats is not provided', async () => {
    const population = createMockPopulation()

    const options: EvolutionOptions = {
      threadCount: 0,
      iterations: 2,
      initialMutations: 0,
      secondsLimit: 0,
      logInterval: 10,
      logTimeIntervalMs: 0,
      earlyStop: false,
      earlyStopPatience: 10,
      earlyStopMinThreshold: 0,
    }

    // Should not throw
    const result = await evolve(population as never, options)
    expect(result).toBeDefined()
  })
})
