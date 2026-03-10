import {
  Organism,
  type Population,
  type Reproducer,
  type Species,
} from '@neat-evolution/evolution'
import {
  Dispatcher,
  type DispatcherContext,
  type WorkerMessage,
} from '@neat-evolution/worker-actions'
import { WorkerPool } from '@neat-evolution/worker-pool'
import QuickLRU from 'quick-lru'

import {
  ActionType,
  type CPPNStateRedirectPayload,
  type EmptyPayload,
  initReproducer,
  type OrganismBatchPayload,
  type OrganismPayload,
  requestReproduceBatch,
  type ReproduceBatchPayload,
  type ReproductionSpeciesPayload,
  requestBreedOrganism,
  requestEliteOrganism,
  type SpeciesPayload,
  terminate as terminateAction,
} from './actions.js'
import type { WorkerReproducerOptions } from './WorkerReproducerOptions.js'

interface CloneableCustomState {
  custom: {
    cloneState: (
      key: CPPNStateRedirectPayload['key'],
      oldKey: CPPNStateRedirectPayload['oldKey']
    ) => void
  }
}

export class WorkerReproducer implements Reproducer {
  public readonly population: Population<any>
  public readonly algorithmPathname: string
  public readonly threadCount: number
  public readonly initPromise: Promise<void>
  public readonly options: WorkerReproducerOptions

  private readonly pool: WorkerPool
  private readonly dispatcher: Dispatcher
  private reproductionPayloadCache:
    | {
        species: QuickLRU<number, OrganismBatchPayload>
        population: OrganismBatchPayload | null
      }
    | null = null

  constructor(population: Population<any>, options: WorkerReproducerOptions) {
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
    this.addTypedMessageHandler(
      ActionType.REQUEST_POPULATION_TOURNAMENT_SELECT,
      this.handleRequestPopulationTournamentSelect.bind(this)
    )

    this.addTypedMessageHandler(
      ActionType.REQUEST_SPECIES_TOURNAMENT_SELECT,
      this.handleRequestSpeciesTournamentSelect.bind(this)
    )
    this.addTypedMessageHandler(
      ActionType.REQUEST_POPULATION_SNAPSHOT,
      this.handleRequestPopulationSnapshot.bind(this)
    )

    this.addTypedMessageHandler(
      ActionType.REQUEST_SET_CPPN_STATE_REDIRECT,
      this.handleRequestSetCPPNStateRedirect.bind(this)
    )

    this.initPromise = this.initWorkers()
  }

  protected async initWorkers() {
    await this.pool.ready()
    const workers = this.pool.getWorkers()
    await Promise.all(
      workers.map(async (worker, workerIndex) => {
        await this.dispatcher.callOnWorker(
          worker,
          initReproducer({
            workerIndex,
            reproducerOptions: this.options,
            populationOptions: this.population.populationOptions,
            configData: this.population.configProvider.toJSON(),
            genomeOptions: this.population.genomeOptions,
            initConfig: this.population.initConfig,
            algorithmPathname: this.algorithmPathname,
          })
        )
      })
    )
  }

  async terminate() {
    await this.initPromise
    await this.dispatcher.broadcast(terminateAction(null))
    await this.pool.terminate()
  }

  private addTypedMessageHandler<P>(
    type: string,
    handler: (action: WorkerMessage<P>, context: DispatcherContext) => void
  ) {
    this.dispatcher.addMessageHandler(type, (action, context) => {
      handler(action as WorkerMessage<P>, context)
    })
  }

  protected handleRequestPopulationTournamentSelect(
    action: WorkerMessage<EmptyPayload>,
    context: DispatcherContext
  ) {
    const responsePayload = this.selectPopulationPayload(1).organisms[0]
    if (responsePayload == null) throw new Error('No organism found')
    // For worker→main→worker RPC, we need to use context.send with proper meta
    if (action.meta?.callId != null) {
      const responseAction: WorkerMessage<OrganismPayload> = {
        type: 'RESPONSE',
        payload: responsePayload,
        meta: {
          callId: action.meta.callId,
          isResponse: true,
        },
      }
      context.send(responseAction)
    }
  }

  protected handleRequestSpeciesTournamentSelect(
    action: WorkerMessage<SpeciesPayload>,
    context: DispatcherContext
  ) {
    const responsePayload = this.selectSpeciesPayload(
      action.payload.speciesId,
      1
    ).organisms[0]
    if (responsePayload == null) throw new Error('No organism found')
    if (action.meta?.callId != null) {
      const responseAction: WorkerMessage<OrganismPayload> = {
        type: 'RESPONSE',
        payload: responsePayload,
        meta: {
          callId: action.meta.callId,
          isResponse: true,
        },
      }
      context.send(responseAction)
    }
  }

  protected handleRequestPopulationSnapshot(
    action: WorkerMessage<EmptyPayload>,
    context: DispatcherContext
  ) {
    const responsePayload = this.getPopulationSnapshotPayload()
    if (action.meta?.callId != null) {
      const responseAction: WorkerMessage<OrganismBatchPayload> = {
        type: 'RESPONSE',
        payload: responsePayload,
        meta: {
          callId: action.meta.callId,
          isResponse: true,
        },
      }
      context.send(responseAction)
    }
  }

  private selectPopulationPayload(count: number): OrganismBatchPayload {
    const organisms: Array<OrganismPayload> = []
    const safeCount = Math.max(1, Math.trunc(count))
    for (let i = 0; i < safeCount; i++) {
      const organism = this.population.tournamentSelect(
        this.population.populationOptions.interspeciesTournamentSize
      )
      if (organism == null) continue
      organisms.push({
        genome: organism.genome.toFactoryOptions(),
        organismState: organism.toFactoryOptions(),
      })
    }
    if (organisms.length === 0) {
      throw new Error('No organism found')
    }
    return { organisms }
  }

  private selectSpeciesPayload(speciesId: number, count: number): OrganismBatchPayload {
    const species = this.population.species.get(speciesId) as Species
    const organisms: Array<OrganismPayload> = []
    const safeCount = Math.max(1, Math.trunc(count))
    for (let i = 0; i < safeCount; i++) {
      const organism = species.tournamentSelect(
        this.population.populationOptions.tournamentSize
      )
      if (organism == null) continue
      organisms.push({
        genome: organism.genome.toFactoryOptions(),
        organismState: organism.toFactoryOptions(),
      })
    }
    if (organisms.length === 0) {
      throw new Error('No organism found')
    }
    return { organisms }
  }

  protected handleRequestSetCPPNStateRedirect(
    action: WorkerMessage<CPPNStateRedirectPayload>,
    context: DispatcherContext
  ) {
    const state = this.population.stateProvider.neat()
    if (!this.hasCloneableCustomState(state)) {
      throw new Error('State provider does not support custom state')
    }
    state.custom.cloneState(action.payload.key, action.payload.oldKey)
    const responsePayload: EmptyPayload = {}
    if (action.meta?.callId != null) {
      const responseAction: WorkerMessage<EmptyPayload> = {
        type: 'RESPONSE',
        payload: responsePayload,
        meta: {
          callId: action.meta.callId,
          isResponse: true,
        },
      }
      context.send(responseAction)
    }
  }

  private hasCloneableCustomState(
    state: ReturnType<Population<any>['stateProvider']['neat']>
  ): state is ReturnType<Population<any>['stateProvider']['neat']> &
    CloneableCustomState {
    return (
      'custom' in state &&
      state.custom != null &&
      typeof state.custom === 'object' &&
      'cloneState' in state.custom &&
      typeof state.custom.cloneState === 'function'
    )
  }

  async copyElites(speciesIds: number[]): Promise<Array<Organism>> {
    await this.initPromise

    const promises: Array<Promise<Organism>> = []
    for (const i of speciesIds) {
      const species = this.population.species.get(i) as Species
      // Steal elites from number of offsprings
      const elitesTakenFromOffspring = Math.min(
        this.population.populationOptions.elitesFromOffspring,
        Math.floor(species.offsprings)
      )
      species.elites += elitesTakenFromOffspring
      species.offsprings -= elitesTakenFromOffspring

      // Directly copy elites, without crossover or mutation
      for (let j = 0; j < species.elites; j++) {
        const organism = species.organisms[j % species.size] as Organism
        promises.push(this.eliteOrganism(organism))
      }
    }
    return await Promise.all(promises)
  }

  async eliteOrganism(organism: Organism): Promise<Organism> {
    const data = await this.dispatcher.call<OrganismPayload>(
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

  async reproduce(speciesIds: number[]): Promise<Array<Organism>> {
    await this.initPromise

    this.reproductionPayloadCache = {
      species: new QuickLRU({ maxSize: Math.max(16, speciesIds.length) }),
      population: null,
    }

    try {
      const batches = this.createReproductionBatches(speciesIds)
      const result = await Promise.all(
        batches.map(async (batch) => {
          const data = await this.dispatcher.call<OrganismBatchPayload>(
            requestReproduceBatch(batch)
          )
          return data.organisms.map((payload) => {
            const genome = this.population.algorithm.createGenome(
              this.population.configProvider,
              this.population.stateProvider,
              this.population.genomeOptions,
              this.population.initConfig,
              payload.genome
            )
            const organism = new Organism(
              genome,
              payload.organismState.generation,
              payload.organismState
            )
            this.population.push(organism, true)
            return organism
          })
        })
      )
      return result.flat()
    } finally {
      this.reproductionPayloadCache = null
    }
  }

  private createReproductionBatches(
    speciesIds: number[]
  ): Array<ReproduceBatchPayload> {
    const speciesPayloads: Array<ReproductionSpeciesPayload> = []
    for (const speciesId of speciesIds) {
      const species = this.population.species.get(speciesId) as Species
      const reproductions = Math.floor(species.offsprings)
      if (reproductions <= 0) continue
      speciesPayloads.push({
        speciesId,
        reproductions,
        organisms: this.getSpeciesSnapshotPayload(speciesId, species).organisms,
      })
    }

    if (speciesPayloads.length === 0) {
      return []
    }

    const totalReproductions = speciesPayloads.reduce(
      (sum, speciesPayload) => sum + speciesPayload.reproductions,
      0
    )
    const targetBatchLoad = Math.max(
      1,
      Math.ceil(totalReproductions / Math.max(1, this.threadCount))
    )

    const plannedSpeciesBatches: Array<ReproductionSpeciesPayload> = []
    for (const speciesPayload of speciesPayloads) {
      let remainingReproductions = speciesPayload.reproductions
      while (remainingReproductions > 0) {
        const reproductions = Math.min(remainingReproductions, targetBatchLoad)
        plannedSpeciesBatches.push({
          speciesId: speciesPayload.speciesId,
          reproductions,
          organisms: speciesPayload.organisms,
        })
        remainingReproductions -= reproductions
      }
    }

    const batches: Array<{
      species: Array<ReproductionSpeciesPayload>
      load: number
    }> = []

    for (const plannedSpecies of plannedSpeciesBatches) {
      const lastBatch = batches[batches.length - 1]
      if (
        lastBatch == null ||
        lastBatch.load + plannedSpecies.reproductions > targetBatchLoad
      ) {
        batches.push({
          species: [plannedSpecies],
          load: plannedSpecies.reproductions,
        })
        continue
      }
      lastBatch.species.push(plannedSpecies)
      lastBatch.load += plannedSpecies.reproductions
    }

    return batches
      .filter((batch) => batch.species.length > 0)
      .map((batch) => ({
        species: batch.species,
      }))
  }

  private getPopulationSnapshotPayload(): OrganismBatchPayload {
    const cached = this.reproductionPayloadCache?.population
    if (cached != null) {
      return cached
    }

    const payload: OrganismBatchPayload = {
      organisms: Array.from(this.population.organismValues()).map((organism) => ({
        genome: organism.genome.toFactoryOptions(),
        organismState: organism.toFactoryOptions(),
      })),
    }
    if (this.reproductionPayloadCache != null) {
      this.reproductionPayloadCache.population = payload
    }
    return payload
  }

  private getSpeciesSnapshotPayload(
    speciesId: number,
    species: Species
  ): OrganismBatchPayload {
    const cached = this.reproductionPayloadCache?.species.get(speciesId)
    if (cached != null) {
      return cached
    }

    const payload: OrganismBatchPayload = {
      organisms: species.organisms.slice(0, species.size).map((organism) => ({
        genome: organism.genome.toFactoryOptions(),
        organismState: organism.toFactoryOptions(),
      })),
    }
    this.reproductionPayloadCache?.species.set(speciesId, payload)
    return payload
  }

  async reproduceSpecies(speciesId: number): Promise<Array<Organism>> {
    const species = this.population.species.get(speciesId) as Species
    const reproductions = Math.floor(species.offsprings)

    const tasks: Array<Promise<Organism>> = []
    for (let i = 0; i < reproductions; i++) {
      tasks.push(this.breedOrganism(speciesId))
    }
    return await Promise.all(tasks)
  }

  async breedOrganism(speciesId: number): Promise<Organism> {
    const data = await this.dispatcher.call<OrganismPayload>(
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
