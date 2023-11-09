import type {
  ConfigFactory,
  ConfigProvider,
  GenomeFactory,
  GenomeFactoryOptions,
  GenomeOptions,
  InitConfig,
  PhenotypeFactory,
  StateFactory,
  StateProvider,
} from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'
import type { Executor, ExecutorFactory } from '@neat-evolution/executor'
import { workerContext } from '@neat-evolution/worker-threads'

import {
  ActionType,
  type Action,
  type PayloadMap,
  type InitPayload,
  createAction,
  type InitGenomeFactoryPayload,
} from './WorkerAction.js'

interface ThreadInfo {
  createConfig: ConfigFactory<any, any, any, any, any>
  createExecutor: ExecutorFactory
  createGenome: GenomeFactory<
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
  >
  createPhenotype: PhenotypeFactory<any>
  createState: StateFactory<any, any, any, any, any, any>
  environment: Environment
}

interface GenomeFactoryConfig {
  configProvider: ConfigProvider<any, any, any>
  stateProvider: StateProvider<any, any, any, any, any>
  genomeOptions: GenomeOptions
  initConfig: InitConfig
}

let threadInfo: ThreadInfo | null = null
let genomeFactoryConfig: GenomeFactoryConfig | null = null

async function handleInitEvaluator({
  algorithmPathname,
  createEnvironmentPathname,
  createExecutorPathname,
  environmentData,
}: InitPayload) {
  const { createConfig, createGenome, createPhenotype, createState } =
    await import(algorithmPathname)
  const { createEnvironment } = await import(createEnvironmentPathname)
  const environment = createEnvironment(environmentData)

  const { createExecutor } = await import(createExecutorPathname)

  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }
  threadInfo = {
    createConfig,
    createExecutor,
    createGenome,
    createPhenotype,
    createState,
    environment,
  }
  workerContext.postMessage(
    createAction(ActionType.INIT_EVALUATOR_SUCCESS, null)
  )
}

async function handleInitGenomeFactory({
  configData,
  genomeOptions,
  initConfig,
}: InitGenomeFactoryPayload<any, any>) {
  if (threadInfo == null) {
    throw new Error('threadInfo not initialized')
  }
  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }

  const configProvider = threadInfo.createConfig(configData)
  const stateProvider = threadInfo.createState()

  genomeFactoryConfig = {
    configProvider,
    stateProvider,
    genomeOptions,
    initConfig,
  }
  workerContext.postMessage(
    createAction(ActionType.INIT_GENOME_FACTORY_SUCCESS, null)
  )
}

const handleEvaluateGenome = async (
  genomeFactoryOptions: GenomeFactoryOptions<any, any>
) => {
  if (threadInfo == null) {
    throw new Error('threadInfo not initialized')
  }
  if (genomeFactoryConfig == null) {
    throw new Error('genomeFactoryConfig not initialized')
  }
  if (workerContext == null) {
    throw new Error('Worker must be created with a parent port')
  }

  // hydrate the genome
  const { configProvider, stateProvider, genomeOptions, initConfig } =
    genomeFactoryConfig
  const genome = threadInfo.createGenome(
    configProvider,
    stateProvider,
    genomeOptions,
    initConfig,
    genomeFactoryOptions
  )

  // create the phenotype and executor
  const phenotype = threadInfo.createPhenotype(genome)
  const executor: Executor = threadInfo.createExecutor(
    phenotype,
    threadInfo.environment.batchSize
  )

  // evaluate the genome
  const fitness = await threadInfo.environment.evaluate(executor)

  workerContext.postMessage(
    createAction(ActionType.RESPOND_EVALUATE_GENOME, fitness)
  )
}

async function handleTerminate() {
  console.debug('Terminating worker')
}

function handleError(error: Error) {
  console.error('Error in worker:', error)
}

if (workerContext !== null) {
  workerContext.addEventListener('message', (action: Action<unknown>) => {
    // FIXME: validate action type and payload
    switch (action.type) {
      case ActionType.INIT_EVALUATOR: {
        handleInitEvaluator(
          action.payload as PayloadMap[ActionType.INIT_EVALUATOR]
        ).catch(handleError)
        break
      }
      case ActionType.INIT_GENOME_FACTORY: {
        handleInitGenomeFactory(
          action.payload as PayloadMap[ActionType.INIT_GENOME_FACTORY]
        ).catch(handleError)
        break
      }
      case ActionType.REQUEST_EVALUATE_GENOME: {
        handleEvaluateGenome(
          action.payload as PayloadMap[ActionType.REQUEST_EVALUATE_GENOME]
        ).catch(handleError)
        break
      }
      case ActionType.TERMINATE: {
        handleTerminate().catch(handleError)
        break
      }
      default: {
        console.error(`Unknown action type: ${action.type}`)
      }
    }
  })
}
