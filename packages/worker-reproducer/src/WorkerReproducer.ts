import {
  type NEATState,
  type Innovation,
  type CoreGenome,
} from '@neat-evolution/core'
import {
  Organism,
  type Reproducer,
  type Species,
} from '@neat-evolution/evolution'
import { Worker } from '@neat-evolution/worker-threads'
import { Sema } from 'async-sema'

import type { AnyPopulation, RequestMapValue } from './types.js'
import {
  type Action,
  ActionType,
  createAction,
  type InitReproducerPayload,
  type OrganismPayload,
  StateType,
} from './WorkerAction.js'
import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

// offset to avoid confusion with worker thread ids
let threadRequestId = 1_000
const nextRequestId = () => {
  const id = threadRequestId++
  if (id === 2_000) {
    threadRequestId = 1_000
  }
  return id
}

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
  public readonly threadCount: number
  public readonly initPromise: Promise<void>
  public readonly options: WorkerReproducerOptions

  private readonly workers: Worker[]
  private readonly semaphore: Sema
  private readonly requestMap = new Map<
    Worker,
    RequestMapValue<OrganismPayload<any>>
  >()

  constructor(population: AnyPopulation<G>, options: WorkerReproducerOptions) {
    this.options = options
    this.population = population
    this.workers = []
    this.requestMap = new Map()
    this.threadCount = options.threadCount
    this.semaphore = new Sema(options.threadCount, {
      capacity: population.populationOptions.populationSize,
    })
    this.initPromise = this.initWorkers()
  }

  protected async initWorkers() {
    const initPromises: Array<Promise<void>> = []

    for (let i = 0; i < this.threadCount; i++) {
      const initPromise = new Promise<void>(
        // eslint-disable-next-line promise/param-names
        (resolveWorkerInit, rejectWorkerInit) => {
          const worker = new Worker(
            new URL('./workerReproducerScript.js', import.meta.url),
            {
              name: `WorkerReproducer-${i}`,
            }
          )

          // messages sent from the reproducer script
          const messageListener = (action: Action<ActionType>) => {
            switch (action.type) {
              case ActionType.RESPOND_ELITE_ORGANISM: {
                this.handleRespondEliteOrganism(
                  worker,
                  action as Action<ActionType.RESPOND_ELITE_ORGANISM>
                )
                break
              }
              case ActionType.RESPOND_BREED_ORGANISM: {
                this.handleRespondBreedOrganism(
                  worker,
                  action as Action<ActionType.RESPOND_BREED_ORGANISM>
                )
                break
              }
              case ActionType.REQUEST_POPULATION_TOURNAMENT_SELECT: {
                this.handleRequestPopulationTournamentSelect(
                  worker,
                  action as Action<ActionType.REQUEST_POPULATION_TOURNAMENT_SELECT>
                )
                break
              }
              case ActionType.REQUEST_SPECIES_TOURNAMENT_SELECT: {
                this.handleRequestSpeciesTournamentSelect(
                  worker,
                  action as Action<ActionType.REQUEST_SPECIES_TOURNAMENT_SELECT>
                )
                break
              }
              case ActionType.REQUEST_SPLIT_INNOVATION: {
                this.handleRequestSplitInnovation(
                  worker,
                  action as Action<ActionType.REQUEST_SPLIT_INNOVATION>
                )
                break
              }
              case ActionType.REQUEST_CONNECT_INNOVATION: {
                this.handleRequestConnectInnovation(
                  worker,
                  action as Action<ActionType.REQUEST_CONNECT_INNOVATION>
                )
                break
              }
              case ActionType.REQUEST_SET_CPPN_STATE_REDIRECT: {
                this.handleRequestSetCPPNStateRedirect(
                  worker,
                  action as Action<ActionType.REQUEST_SET_CPPN_STATE_REDIRECT>
                )
                break
              }
              case ActionType.INIT_REPRODUCER_SUCCESS: {
                this.workers.push(worker)
                resolveWorkerInit()
                break
              }
              default: {
                const { reject: rejectRequest } =
                  this.requestMap.get(worker) ?? {}
                const error = new Error('Unexpected action type')
                if (rejectRequest != null) {
                  console.error(error)
                  rejectRequest(error)
                } else {
                  console.error(error)
                  rejectWorkerInit(error)
                }
                break
              }
            }
          }

          const errorListener = (error: Error) => {
            const { reject: rejectRequest } = this.requestMap.get(worker) ?? {}
            if (rejectRequest != null) {
              console.error(error)
              rejectRequest(error)
            } else {
              console.error(error)
              rejectWorkerInit(error)
            }
          }

          worker.addEventListener('message', messageListener)
          worker.addEventListener('error', errorListener)

          // FIXME: any, any, any
          const data: InitReproducerPayload<any, any> = {
            reproducerOptions: this.options,
            populationOptions: this.population.populationOptions,
            configData: this.population.configProvider.toJSON(),
            genomeOptions: this.population.genomeOptions,
            initConfig: this.population.initConfig,
            algorithmPathname: this.population.algorithm.pathname,
          }

          worker.postMessage(createAction(ActionType.INIT_REPRODUCER, data))
        }
      )
      initPromises.push(initPromise)
    }
    await Promise.all(initPromises)
  }

  async terminate() {
    const terminatePromises = new Set<Promise<void>>()
    for (const worker of this.workers) {
      // worker.unref()
      worker.postMessage(createAction(ActionType.TERMINATE, null))
      terminatePromises.add(worker.terminate())
    }
    for (const p of terminatePromises) {
      await p
    }
  }

  protected handleRespondEliteOrganism(
    worker: Worker,
    action: Action<ActionType.RESPOND_ELITE_ORGANISM>
  ) {
    const { resolve } = this.requestMap.get(worker) ?? {}
    if (resolve == null) {
      throw new Error('no request found')
    }
    resolve(action.payload)
  }

  protected handleRespondBreedOrganism(
    worker: Worker,
    action: Action<ActionType.RESPOND_BREED_ORGANISM>
  ) {
    const { resolve } = this.requestMap.get(worker) ?? {}
    if (resolve == null) {
      throw new Error('no request found')
    }
    resolve(action.payload)
  }

  protected handleRequestPopulationTournamentSelect(
    worker: Worker,
    action: Action<ActionType.REQUEST_POPULATION_TOURNAMENT_SELECT>
  ) {
    const organism = this.population.tournamentSelect(
      this.population.populationOptions.interspeciesTournamentSize
    )
    if (organism == null) {
      throw new Error('No organism found')
    }
    // FIXME: OrganismPayload<GFO>
    const payload: OrganismPayload<any> = {
      genome: organism.genome.toFactoryOptions(),
      organismState: organism.toFactoryOptions(),
      requestId: action.payload.requestId,
    }
    worker.postMessage(
      createAction(ActionType.RESPOND_POPULATION_TOURNAMENT_SELECT, payload)
    )
  }

  protected handleRequestSpeciesTournamentSelect(
    worker: Worker,
    action: Action<ActionType.REQUEST_SPECIES_TOURNAMENT_SELECT>
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
    const payload: OrganismPayload<any> = {
      genome: organism.genome.toFactoryOptions(),
      organismState: organism.toFactoryOptions(),
      requestId: action.payload.requestId,
    }
    worker.postMessage(
      createAction(ActionType.RESPOND_SPECIES_TOURNAMENT_SELECT, payload)
    )
  }

  protected handleRequestSplitInnovation(
    worker: Worker,
    action: Action<ActionType.REQUEST_SPLIT_INNOVATION>
  ) {
    const { stateType, stateKey } = action.payload
    let state: NEATState
    if (stateType === StateType.NEAT) {
      state = this.population.stateProvider.neat()
    } else if (stateType === StateType.SINGLE_CPPN_STATE) {
      if (this.population.stateProvider.custom == null) {
        throw new Error('State provider does not support custom state')
      }
      const stateProvider = this.population.stateProvider
      state = stateProvider.custom.singleCPPNState
    } else if (stateType === StateType.UNIQUE_CPPN_STATES && stateKey != null) {
      if (this.population.stateProvider.custom == null) {
        throw new Error('State provider does not support custom state')
      }
      const stateProvider = this.population.stateProvider
      state = stateProvider.custom.getOrCreateState(
        stateKey,
        this.population.genomeOptions.singleCPPNState ?? false
      )
    } else {
      throw new Error('Unknown state type')
    }

    const innovation = state.getSplitInnovation(
      action.payload.innovation
    ) as Innovation

    const payload = {
      requestId: action.payload.requestId,
      ...innovation,
    }
    worker.postMessage(
      createAction(ActionType.RESPOND_SPLIT_INNOVATION, payload)
    )
  }

  protected handleRequestConnectInnovation(
    worker: Worker,
    action: Action<ActionType.REQUEST_CONNECT_INNOVATION>
  ) {
    const { stateType, stateKey } = action.payload
    let state: NEATState
    if (stateType === StateType.NEAT) {
      state = this.population.stateProvider.neat()
    } else if (stateType === StateType.SINGLE_CPPN_STATE) {
      if (this.population.stateProvider.custom == null) {
        throw new Error('State provider does not support custom state')
      }
      const stateProvider = this.population.stateProvider
      state = stateProvider.custom.singleCPPNState
    } else if (stateType === StateType.UNIQUE_CPPN_STATES && stateKey != null) {
      if (this.population.stateProvider.custom == null) {
        throw new Error('State provider does not support custom state')
      }
      const stateProvider = this.population.stateProvider
      state = stateProvider.custom.getOrCreateState(
        stateKey,
        this.population.genomeOptions.singleCPPNState ?? false
      )
    } else {
      throw new Error('Unknown state type')
    }
    const innovation: number = state.getConnectInnovation(
      action.payload.from,
      action.payload.to
    ) as number
    const payload = {
      requestId: action.payload.requestId,
      innovation,
    }
    worker.postMessage(
      createAction(ActionType.RESPOND_CONNECT_INNOVATION, payload)
    )
  }

  protected handleRequestSetCPPNStateRedirect(
    worker: Worker,
    action: Action<ActionType.REQUEST_SET_CPPN_STATE_REDIRECT>
  ) {
    const state = this.population.stateProvider.neat()
    if (state.custom?.cloneState == null) {
      throw new Error('State provider does not support custom state')
    }
    state.custom.cloneState(action.payload.key, action.payload.oldKey)
    const payload = {
      requestId: action.payload.requestId,
    }
    worker.postMessage(
      createAction(ActionType.RESPOND_SET_CPPN_STATE_REDIRECT, payload)
    )
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
    await this.semaphore.acquire()
    const worker = this.workers.pop()

    if (worker == null) {
      this.semaphore.release()
      throw new Error('No worker available')
    }
    let elite: Organism<any, any, any, any, any, any, G>
    try {
      const data = await this.requestEliteOrganism(worker, organism)
      const genome = this.population.algorithm.createGenome(
        this.population.configProvider,
        this.population.stateProvider,
        this.population.genomeOptions,
        this.population.initConfig,
        data.genome
      )
      elite = new Organism(
        genome,
        data.organismState.generation,
        data.organismState
      )
    } finally {
      this.workers.push(worker)
      this.semaphore.release()
    }
    this.population.push(elite, true)
    return elite
  }

  protected async requestEliteOrganism(
    worker: Worker,
    organism: Organism<any, any, any, any, any, any, G>
  ): Promise<OrganismPayload<any>> {
    return await new Promise((resolve, reject) => {
      const customResolve = (
        value: OrganismPayload<any> | PromiseLike<OrganismPayload<any>>
      ) => {
        this.requestMap.delete(worker)
        resolve(value)
      }
      const requestId = nextRequestId()
      this.requestMap.set(worker, { resolve: customResolve, reject })
      const payload: OrganismPayload<any> = {
        genome: organism.genome.toFactoryOptions(),
        organismState: organism.toFactoryOptions(),
        // use negative requests to avoid confusion with worker thread ids
        requestId: -requestId,
      }
      worker.postMessage(
        createAction(ActionType.REQUEST_ELITE_ORGANISM, payload)
      )
    })
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
    await this.semaphore.acquire()
    const worker = this.workers.pop()

    if (worker == null) {
      this.semaphore.release()
      throw new Error('No worker available')
    }

    let organism: Organism<any, any, any, any, any, any, G>
    try {
      const data = await this.requestBreedOrganism(worker, speciesId)
      const genome = this.population.algorithm.createGenome(
        this.population.configProvider,
        this.population.stateProvider,
        this.population.genomeOptions,
        this.population.initConfig,
        data.genome
      )
      organism = new Organism(
        genome,
        data.organismState.generation,
        data.organismState
      )
    } finally {
      this.workers.push(worker)
      this.semaphore.release()
    }
    this.population.push(organism, true)
    return organism
  }

  protected async requestBreedOrganism(
    worker: Worker,
    speciesId: number
  ): Promise<OrganismPayload<any>> {
    return await new Promise((resolve, reject) => {
      const customResolve = (
        value: OrganismPayload<any> | PromiseLike<OrganismPayload<any>>
      ) => {
        this.requestMap.delete(worker)
        resolve(value)
      }
      const requestId = nextRequestId()
      this.requestMap.set(worker, { resolve: customResolve, reject })
      worker.postMessage(
        createAction(ActionType.REQUEST_BREED_ORGANISM, {
          // use negative requests to avoid confusion with worker thread ids
          requestId: -requestId,
          speciesId,
        })
      )
    })
  }
}
