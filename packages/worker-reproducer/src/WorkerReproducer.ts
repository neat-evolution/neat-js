import type { CoreGenome } from '@neat-evolution/core'
import {
  Organism,
  type Reproducer,
  type Species,
} from '@neat-evolution/evolution'
import {
  Dispatcher,
  type DispatcherContext,
  type WorkerAction,
} from '@neat-evolution/worker-actions'
import { WorkerPool } from '@neat-evolution/worker-pool'

import {
  ActionType,
  initReproducer,
  terminate as terminateAction,
  requestEliteOrganism,
  requestBreedOrganism,
  type EmptyPayload,
  type OrganismPayload,
  type SpeciesPayload,
  type CPPNStateRedirectPayload,
} from './actions.js'
import type { AnyPopulation } from './types.js'
import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

export class WorkerReproducer<
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
    any,
    any,
    G
  >,
> implements Reproducer<G>
{
  public readonly population: AnyPopulation<G>
  public readonly algorithmPathname: string
  public readonly threadCount: number
  public readonly initPromise: Promise<void>
  public readonly options: WorkerReproducerOptions

  private readonly pool: WorkerPool
  private readonly dispatcher: Dispatcher

  constructor(population: AnyPopulation<G>, options: WorkerReproducerOptions) {
    this.options = options
    this.population = population
    this.algorithmPathname =
      options.algorithmPathname ?? population.algorithm.pathname
    this.threadCount = options.threadCount

    // Use provided workerScriptUrl or fall back to default (works in Node.js, not Vite)
    const workerScriptUrl =
      options.workerScriptUrl ??
      new URL('./workerReproducerScript.js', import.meta.url)

    this.pool = new WorkerPool({
      threadCount: options.threadCount,
      taskCount: population.populationOptions.populationSize,
      workerScriptUrl,
      workerOptions: {
        name: 'WorkerReproducer',
        type: 'module',
      },
    })

    this.dispatcher = new Dispatcher(this.pool, {
      verbose: options.verbose ?? false,
    })

    // Add handlers for requests from workers
    this.dispatcher.addActionHandler(
      ActionType.REQUEST_POPULATION_TOURNAMENT_SELECT,
      this.handleRequestPopulationTournamentSelect.bind(this)
    )

    this.dispatcher.addActionHandler(
      ActionType.REQUEST_SPECIES_TOURNAMENT_SELECT,
      this.handleRequestSpeciesTournamentSelect.bind(this)
    )

    this.dispatcher.addActionHandler(
      ActionType.REQUEST_SET_CPPN_STATE_REDIRECT,
      this.handleRequestSetCPPNStateRedirect.bind(this)
    )

    this.initPromise = this.initWorkers()
  }

  protected async initWorkers() {
    await this.pool.ready()

    await this.dispatcher.broadcast(
      initReproducer({
        reproducerOptions: this.options,
        populationOptions: this.population.populationOptions,
        configData: this.population.configProvider.toJSON(),
        genomeOptions: this.population.genomeOptions,
        initConfig: this.population.initConfig,
        algorithmPathname: this.algorithmPathname,
      })
    )
  }

  async terminate() {
    await this.initPromise
    await this.dispatcher.broadcast(terminateAction())
    await this.pool.terminate()
  }

  protected handleRequestPopulationTournamentSelect(
    action: WorkerAction<EmptyPayload>,
    context: DispatcherContext
  ) {
    const organism = this.population.tournamentSelect(
      this.population.populationOptions.interspeciesTournamentSize
    )
    if (organism == null) {
      throw new Error('No organism found')
    }
    // FIXME: OrganismPayload<GFO>
    const responsePayload: OrganismPayload<any> = {
      genome: organism.genome.toFactoryOptions(),
      organismState: organism.toFactoryOptions(),
    }
    // For worker→main→worker RPC, we need to use context.dispatch with proper meta
    if (action.meta?.requestId != null) {
      const responseAction: WorkerAction<OrganismPayload<any>> = {
        type: 'RESPONSE',
        payload: responsePayload,
        meta: {
          requestId: action.meta.requestId,
          isResponse: true,
        },
      }
      context.dispatch(responseAction)
    }
  }

  protected handleRequestSpeciesTournamentSelect(
    action: WorkerAction<SpeciesPayload>,
    context: DispatcherContext
  ) {
    const { speciesId } = action.payload
    const species = this.population.species.get(speciesId) as Species<
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >
    const organism = species.tournamentSelect(
      this.population.populationOptions.tournamentSize
    )
    if (organism == null) {
      throw new Error('No organism found')
    }
    const responsePayload: OrganismPayload<any> = {
      genome: organism.genome.toFactoryOptions(),
      organismState: organism.toFactoryOptions(),
    }
    if (action.meta?.requestId != null) {
      const responseAction: WorkerAction<OrganismPayload<any>> = {
        type: 'RESPONSE',
        payload: responsePayload,
        meta: {
          requestId: action.meta.requestId,
          isResponse: true,
        },
      }
      context.dispatch(responseAction)
    }
  }

  protected handleRequestSetCPPNStateRedirect(
    action: WorkerAction<CPPNStateRedirectPayload>,
    context: DispatcherContext
  ) {
    const state = this.population.stateProvider.neat()
    if (state.custom?.cloneState == null) {
      throw new Error('State provider does not support custom state')
    }
    state.custom.cloneState(action.payload.key, action.payload.oldKey)
    const responsePayload: EmptyPayload = {}
    if (action.meta?.requestId != null) {
      const responseAction: WorkerAction<EmptyPayload> = {
        type: 'RESPONSE',
        payload: responsePayload,
        meta: {
          requestId: action.meta.requestId,
          isResponse: true,
        },
      }
      context.dispatch(responseAction)
    }
  }

  async copyElites(
    speciesIds: number[]
  ): Promise<Array<Organism<any, any, any, any, any, any, G>>> {
    const promises: Array<Promise<Organism<any, any, any, any, any, any, G>>> =
      []
    for (const i of speciesIds) {
      const species = this.population.species.get(i) as Species<
        any,
        any,
        any,
        any,
        any,
        any,
        any
      >
      // Steal elites from number of offsprings
      const elitesTakenFromOffspring = Math.min(
        this.population.populationOptions.elitesFromOffspring,
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
          G
        >
        promises.push(this.eliteOrganism(organism))
      }
    }
    return await Promise.all(promises)
  }

  async eliteOrganism(
    organism: Organism<any, any, any, any, any, any, G>
  ): Promise<Organism<any, any, any, any, any, any, G>> {
    await this.initPromise

    const data = await this.dispatcher.request<OrganismPayload<any>>(
      requestEliteOrganism({
        genome: organism.genome.toFactoryOptions(),
        organismState: organism.toFactoryOptions(),
      })
    )
    const genome = this.population.algorithm.createGenome(
      this.population.configProvider,
      this.population.stateProvider,
      this.population.genomeOptions,
      this.population.initConfig,
      data.genome
    )
    const elite = new Organism(
      genome,
      data.organismState.generation,
      data.organismState
    )
    this.population.push(elite, true)
    return elite
  }

  async reproduce(
    speciesIds: number[]
  ): Promise<Array<Organism<any, any, any, any, any, any, G>>> {
    const result = await Promise.all(
      speciesIds.map(
        async (speciesId) => await this.reproduceSpecies(speciesId)
      )
    )
    return result.flat()
  }

  async reproduceSpecies(
    speciesId: number
  ): Promise<Array<Organism<any, any, any, any, any, any, G>>> {
    const species = this.population.species.get(speciesId) as Species<
      any,
      any,
      any,
      any,
      any,
      any,
      any
    >
    const reproductions = Math.floor(species.offsprings)

    const promises: Array<Promise<Organism<any, any, any, any, any, any, G>>> =
      []
    for (let _ = 0; _ < reproductions; _++) {
      promises.push(this.breedOrganism(speciesId))
    }
    return await Promise.all(promises)
  }

  async breedOrganism(
    speciesId: number
  ): Promise<Organism<any, any, any, any, any, any, G>> {
    await this.initPromise

    const data = await this.dispatcher.request<OrganismPayload<any>>(
      requestBreedOrganism({
        speciesId,
      })
    )
    const genome = this.population.algorithm.createGenome(
      this.population.configProvider,
      this.population.stateProvider,
      this.population.genomeOptions,
      this.population.initConfig,
      data.genome
    )
    const organism = new Organism(
      genome,
      data.organismState.generation,
      data.organismState
    )
    this.population.push(organism, true)
    return organism
  }
}
