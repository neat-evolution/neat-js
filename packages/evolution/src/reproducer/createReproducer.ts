import type { RNG } from '@neat-evolution/utils'

import type { Organism } from '../Organism.js'
import type { Population } from '../Population.js'
import type { Species } from '../Species.js'

import type { Reproducer } from './Reproducer.js'

export const createReproducer = <P extends Population>(
  population: P
): Reproducer => {
  return {
    copyElites: async (speciesIds: number[]) => {
      const organisms: Array<Organism> = []
      for (const i of speciesIds) {
        const species = population.species.get(i) as Species
        // Steal elites from number of offsprings
        const elitesTakenFromOffspring = Math.min(
          population.populationOptions.elitesFromOffspring,
          Math.floor(species.offsprings)
        )
        species.elites += elitesTakenFromOffspring
        species.offsprings -= elitesTakenFromOffspring

        // Directly copy elites, without crossover or mutation
        for (let j = 0; j < species.elites; j++) {
          const organism = species.organisms[j % species.size] as Organism
          const elite = organism.asElite()
          organisms.push(elite)
          population.push(elite, true)
        }
      }
      return organisms
    },
    reproduce: async (speciesIds: number[], rng: RNG) => {
      const organisms: Array<Organism> = []
      let offspringIndex = 0

      for (const i of speciesIds) {
        const species = population.species.get(i) as Species
        const reproductions = Math.floor(species.offsprings)

        // Breed new organisms
        for (let _ = 0; _ < reproductions; _++) {
          const father =
            rng.gen() <
            population.populationOptions.interspeciesReproductionProbability
              ? // Interspecies breeding
                population.tournamentSelect(
                  population.populationOptions.interspeciesTournamentSize,
                  rng
                )
              : // Breeding within species
                species.tournamentSelect(
                  population.populationOptions.tournamentSize,
                  rng
                )

          if (father == null) {
            throw new Error('Unable to gather father organism')
          }

          let child: Organism
          if (
            rng.gen() <
            population.populationOptions.asexualReproductionProbability
          ) {
            child = father.asElite()
          } else {
            const mother = species.tournamentSelect(
              population.populationOptions.tournamentSize,
              rng
            )
            if (mother == null) {
              throw new Error('Unable to gather mother organism')
            }
            child = mother.crossover(father, rng)
          }

          await child.mutate(rng.derive(`offspring:${offspringIndex}`))
          offspringIndex++
          organisms.push(child)
          population.push(child, true)
        }
      }
      return organisms
    },
  }
}
