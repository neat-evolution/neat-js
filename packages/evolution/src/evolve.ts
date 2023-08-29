import { type EvolutionOptions } from './EvolutionOptions.js'
import type { Organism } from './Organism.js'
import { type Population } from './Population.js'

export const evolve = async <
  P extends Population<any, any, any>,
  O extends EvolutionOptions = EvolutionOptions
>(
  population: P,
  options: O
) => {
  for (let _ = 0; _ < options.initialMutations; _++) {
    population.mutate()
  }

  const iterations =
    options.iterations > 0 ? options.iterations + 1 : Number.MAX_SAFE_INTEGER

  const startTime = Date.now()
  for (let i = 0; i < iterations; i++) {
    console.log(`Iteration ${i + 1}`)
    const iterationStartTime = Date.now()
    await population.evaluate()

    // FIXME: break when
    // - seconds limit is reached
    // - fitness limit is reached
    // - iterations limit is reached
    if (
      options.secondsLimit > 0 &&
      Date.now() - startTime >= (options.secondsLimit + 3) * 1000
    ) {
      break
    }
    console.log(`fitness: ${(population.best() as Organism<any>).fitness ?? 0}`)

    population.evolve()

    console.log(`took ${Date.now() - iterationStartTime}ms`)
  }
  console.log(`ended after ${Date.now() - startTime}ms`)
  for (const species of population.species.values()) {
    species.adjustFitness()
  }
  return population.best()
}
