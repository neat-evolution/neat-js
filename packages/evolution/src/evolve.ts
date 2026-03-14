import type { EvolutionOptions } from './EvolutionOptions.js'
import { logger } from './logger.js'
import type { Organism } from './Organism.js'
import type { Population } from './Population.js'
import type { GenerationRecord } from './records/GenerationRecord.js'
import type { RunSummaryRecord } from './records/RunSummaryRecord.js'

export const evolve = async <
  P extends Population<any>,
  O extends Organism<any> = Organism<any>,
>(
  population: P,
  options: EvolutionOptions<P, O>
): Promise<O | undefined> => {
  const iterations =
    options.iterations > 0 ? options.iterations : Number.MAX_SAFE_INTEGER

  const startTime = Date.now()
  let bestFitness = -Infinity
  let bestIteration = -1
  let bestOrganism: O | undefined
  let stopReason: RunSummaryRecord['stopReason'] = 'completed'
  let completedIterations = 0

  for (let i = 0; i < iterations; i++) {
    if (i % options.logInterval === 0) {
      logger.log(`Iter: ${i}`)
    }
    const iterationStartTime = Date.now()

    // Check abort/timeout before doing work
    if (options.signal?.aborted === true) {
      logger.log('🛑 Evolution aborted')
      stopReason = 'aborted'
      break
    }
    if (
      options.secondsLimit > 0 &&
      Date.now() - startTime >= (options.secondsLimit + 3) * 1000
    ) {
      logger.log(`⌛ seconds limit ${options.secondsLimit} reached`)
      stopReason = 'timeout'
      break
    }

    // Mutate: initial mutations for i===0, or single mutation for i>0
    if (i === 0 && options.initialMutations > 0) {
      for (let _ = 0; _ < options.initialMutations; _++) {
        await population.mutate()
      }
    } else {
      await population.evolve()
    }

    const afterEvolveCallback = options.afterEvolve
    if (afterEvolveCallback != null) {
      const afterEvolveInterval = options.afterEvolveInterval ?? 1
      if (i % afterEvolveInterval === 0) {
        afterEvolveCallback(population, i)
      }
    }

    // Evaluate
    await population.evaluate()
    const afterEvaluateCallback = options.afterEvaluate
    if (afterEvaluateCallback != null) {
      const afterEvaluateInterval = options.afterEvaluateInterval ?? 1
      if (i % afterEvaluateInterval === 0) {
        afterEvaluateCallback(population, i)
      }
    }

    // Post-evaluation record keeping
    const best = population.best() as O

    if ((best.fitness ?? 0) > bestFitness) {
      bestFitness = best.fitness ?? (0 as number)
      bestOrganism = best
      bestIteration = i
      logger.log(`🌟 New best ${bestFitness} in iteration ${bestIteration}`)
      logger.log(`---`)
      options.handleNewBest?.(best, i)
    }

    // Early stop check (after evaluation)
    if (
      options.earlyStop &&
      (best.fitness ?? 0) < bestFitness + options.earlyStopMinThreshold &&
      i - bestIteration > options.earlyStopPatience
    ) {
      logger.log(`🥵 early stop after ${i} iterations`)
      stopReason = 'early-stop'
      break
    }

    completedIterations = i + 1

    const wantsLog = i % options.logInterval === 0
    const wantsStats = options.stats?.wants('generation') === true

    // Core evolution reporting — always logged, gated by logInterval
    if (wantsLog || wantsStats) {
      const iterationMs = Date.now() - iterationStartTime
      const speciesSizes = Array.from(population.species.values()).map(
        (s) => s.organisms.length
      )

      if (wantsLog) {
        logger.log(`fitness: ${best.fitness ?? 0}`)
        logger.log(`best: ${bestFitness} in iteration ${bestIteration}`)
        logger.log('genome:')
        logger.log(` hiddenNodes: ${best.genome.hiddenNodes.size}`)
        logger.log(` links: ${best.genome.links.size}`)
        logger.log(
          `Population(species: ${population.species.size}, extinct: ${
            population.extinctSpecies.size
          }) ${speciesSizes.join(' ')}`
        )
        logger.log(`took ${iterationMs}ms`)
        logger.log('---')
      }

      // Consumer stats — every iteration, consumers gate themselves
      if (wantsStats && options.stats != null) {
        const record: GenerationRecord = {
          iteration: i,
          fitness: best.fitness ?? null,
          bestFitness,
          bestIteration,
          speciesCount: population.species.size,
          extinctSpeciesCount: population.extinctSpecies.size,
          speciesSizes,
          hiddenNodes: best.genome.hiddenNodes.size,
          links: best.genome.links.size,
          iterationMs,
          totalMs: Date.now() - startTime,
        }
        options.stats.record('generation', record)
      }
    }
  }

  // Record run summary
  if (options.stats?.wants('run-summary') === true) {
    const summary: RunSummaryRecord = {
      totalIterations: completedIterations,
      totalMs: Date.now() - startTime,
      bestFitness,
      bestIteration,
      stopReason,
    }
    options.stats.record('run-summary', summary)
  }

  logger.log(`ended after ${Date.now() - startTime}ms`)
  logger.log(`🏆 best fitness: ${bestFitness}`)
  return bestOrganism
}
