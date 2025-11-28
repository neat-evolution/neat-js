import { type EvolutionOptions } from './EvolutionOptions.js'
import type { Organism } from './Organism.js'
import { type Population } from './Population.js'

export const evolve = async <
  P extends Population<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >,
>(
  population: P,
  options: EvolutionOptions<P, Organism<any, any, any, any, any, any, any>>
) => {
  const iterations =
    options.iterations > 0 ? options.iterations : Number.MAX_SAFE_INTEGER

  const startTime = Date.now()
  let bestFitness = -Infinity
  let bestIteration = -1
  let bestOrganism: Organism<any, any, any, any, any, any, any> | undefined

  for (let i = 0; i < iterations; i++) {
    if (i % options.logInterval === 0) {
      console.log(`Iter: ${i}`)
    }
    const iterationStartTime = Date.now()

    // Check abort/timeout before doing work
    if (options.signal?.aborted === true) {
      console.log('🛑 Evolution aborted')
      break
    }
    if (
      options.secondsLimit > 0 &&
      Date.now() - startTime >= (options.secondsLimit + 3) * 1000
    ) {
      console.log(`⌛ seconds limit ${options.secondsLimit} reached`)
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
    const best = population.best() as Organism<
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >

    if ((best.fitness ?? 0) > bestFitness) {
      bestFitness = best.fitness ?? (0 as number)
      bestOrganism = best
      bestIteration = i
      console.log(`🌟 New best ${bestFitness} in iteration ${bestIteration}`)
      console.log(`---`)
      options.handleNewBest?.(best, i)
    }

    // Early stop check (after evaluation)
    if (
      options.earlyStop &&
      (best.fitness ?? 0) < bestFitness + options.earlyStopMinThreshold &&
      i - bestIteration > options.earlyStopPatience
    ) {
      console.log(`🥵 early stop after ${i} iterations`)
      break
    }

    if (i % options.logInterval === 0) {
      console.log(`fitness: ${best.fitness ?? 0}`)
      console.log(`best: ${bestFitness} in iteration ${bestIteration}`)
      console.log('genome:')
      console.log(` hiddenNodes: ${best.genome.hiddenNodes.size}`)
      console.log(` links: ${best.genome.links.size}`)
      console.log(
        `Population(species: ${population.species.size}, extinct: ${
          population.extinctSpecies.size
        }) ${Array.from(population.species.values())
          .map((s) => s.organisms.length)
          .join(' ')}`
      )
      console.log(`took ${Date.now() - iterationStartTime}ms`)
      console.log('---')
    }
  }
  console.log(`ended after ${Date.now() - startTime}ms`)
  console.log(`🏆 best fitness: ${bestFitness}`)
  return bestOrganism
}
