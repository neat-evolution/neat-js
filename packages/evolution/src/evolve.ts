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
  O extends EvolutionOptions = EvolutionOptions,
>(
  population: P,
  options: O
) => {
  for (let _ = 0; _ < options.initialMutations; _++) {
    await population.mutate()
  }

  const iterations =
    options.iterations > 0 ? options.iterations + 1 : Number.MAX_SAFE_INTEGER

  const startTime = Date.now()
  let didTimeout = false
  let didEarlyStop = false
  let bestFitness = -Infinity
  let bestIteration = -1
  let bestOrganism: Organism<any, any, any, any, any, any, any> | undefined
  for (let i = 0; i < iterations; i++) {
    if (i % options.logInterval === 0) {
      console.log(`Iter: ${i}`)
    }
    const iterationStartTime = Date.now()
    await population.evaluate()

    // FIXME: break when fitness limit is reached
    if (
      options.secondsLimit > 0 &&
      Date.now() - startTime >= (options.secondsLimit + 3) * 1000
    ) {
      console.log(`⌛ seconds limit ${options.secondsLimit} reached`)
      didTimeout = true
      break
    }
    const best = population.best() as Organism<
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >

    if (
      options.earlyStop &&
      (best.fitness ?? 0) < bestFitness + options.earlyStopMinThreshold &&
      i - bestIteration > options.earlyStopPatience
    ) {
      console.log(`🥵 early stop after ${i} iterations`)
      didEarlyStop = true
      break
    }
    if ((best.fitness ?? 0) > bestFitness) {
      bestFitness = best.fitness ?? (0 as number)
      bestOrganism = best
      bestIteration = i
      console.log(`🌟 New best ${bestFitness} in iteration ${bestIteration}`)
      console.log(`---`)
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
    }

    await population.evolve()
    if (i % options.logInterval === 0) {
      console.log(`took ${Date.now() - iterationStartTime}ms`)
      console.log('---')
    }
  }
  console.log(`ended after ${Date.now() - startTime}ms`)

  if (!didTimeout && !didEarlyStop) {
    // final evaluation for fitness
    await population.evaluate()
  }
  const lastBest = population.best() as Organism<
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >
  console.log(`last best fitness: ${lastBest.fitness ?? 0}`)
  console.log(`🏆 best fitness: ${bestFitness}`)
  return (lastBest.fitness ?? bestFitness) < 0 ? lastBest : bestOrganism
}
