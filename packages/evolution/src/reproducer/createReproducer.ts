import type { CoreGenome } from '@neat-js/core'
import { threadRNG } from '@neat-js/utils'

import type { Organism } from '../Organism.js'
import type { Population } from '../Population.js'
import type { Species } from '../Species.js'

import type { Reproducer } from './Reproducer.js'
import type { ReproducerFactory } from './ReproducerFactory.js'

// FIXME: is ReproducerFactory<any, any, undefined> the best way to do this?
export const createReproducer: ReproducerFactory<any, any, undefined> = <
  G extends CoreGenome<
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
    G
  >,
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
    G,
    any,
    undefined
  >
>(
  population: P
): Reproducer<G> => {
  const rng = threadRNG()
  return {
    copyElites: async (speciesIds: number[]) => {
      const organisms: Array<Organism<any, any, any, any, any, any, any, G>> =
        []
      for (const i of speciesIds) {
        const species = population.species.get(i) as Species<
          any,
          any,
          any,
          any,
          any,
          any,
          any,
          G
        >
        // Steal elites from number of offsprings
        const elitesTakenFromOffspring = Math.min(
          population.populationOptions.elitesFromOffspring,
          Math.floor(species.offsprings)
        )
        species.elites += elitesTakenFromOffspring
        species.offsprings -= elitesTakenFromOffspring

        // Directly copy elites, without crossover or mutation
        for (let j = 0; j < species.elites; j++) {
          const organism = species.organisms[j % species.size] as Organism<
            any,
            any,
            any,
            any,
            any,
            any,
            any,
            G
          >
          const elite = organism.asElite()
          organisms.push(elite)
          population.push(elite, true)
        }
      }
      return organisms
    },
    reproduce: async (speciesIds: number[]) => {
      const organisms: Array<Organism<any, any, any, any, any, any, any, G>> =
        []

      for (const i of speciesIds) {
        const species = population.species.get(i) as Species<
          any,
          any,
          any,
          any,
          any,
          any,
          any,
          G
        >
        const reproductions = Math.floor(species.offsprings)

        // Breed new organisms
        for (let _ = 0; _ < reproductions; _++) {
          const father =
            rng.gen() <
            population.populationOptions.interspeciesReproductionProbability
              ? // Interspecies breeding
                population.tournamentSelect(
                  population.populationOptions.interspeciesTournamentSize
                )
              : // Breeding within species
                species.tournamentSelect(
                  population.populationOptions.tournamentSize
                )

          if (father == null) {
            throw new Error('Unable to gather father organism')
          }

          let child: Organism<any, any, any, any, any, any, any, G>
          if (
            rng.gen() <
            population.populationOptions.asexualReproductionProbability
          ) {
            child = father.asElite()
          } else {
            const mother = species.tournamentSelect(
              population.populationOptions.tournamentSize
            )
            if (mother == null) {
              throw new Error('Unable to gather mother organism')
            }
            child = mother.crossover(father)
          }

          await child.mutate()
          organisms.push(child)
          population.push(child, true)
        }
      }
      return organisms
    },
  }
}
