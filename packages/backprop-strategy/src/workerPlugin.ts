import { isSupervisedEnvironment } from '@neat-evolution/environment'
import type { Handler, WorkerContext } from '@neat-evolution/worker-actions'
import type { ThreadContext } from '@neat-evolution/worker-evaluator/worker'

import { ActionType, type TrainGenomePayload } from './actions.js'
import { trainGenome } from './trainGenome.js'

/**
 * Worker plugin for BackpropPlugin.
 * Registers the REQUEST_TRAIN_GENOME handler on the worker.
 */
const backpropWorkerPlugin = (
  handler: Handler,
  threadContext: ThreadContext & WorkerContext
): void => {
  handler.register(ActionType.REQUEST_TRAIN_GENOME, async (payload) => {
    const { genomeOptions, trainingEpochs, learningRate, isLamarckian } =
      payload as TrainGenomePayload
    const { threadInfo, genomeFactoryConfig } = threadContext

    if (!threadInfo) {
      throw new Error('Worker not initialized: threadInfo is missing')
    }

    const env = threadInfo.environment
    if (!isSupervisedEnvironment(env)) {
      throw new Error(
        'Worker environment does not implement SupervisedEnvironment'
      )
    }

    if (!genomeFactoryConfig) {
      throw new Error('Worker not initialized: genomeFactoryConfig is missing')
    }

    // Reconstruct genome and create phenotype (same as handleEvaluateGenome)
    const genome = threadInfo.createGenome(
      genomeFactoryConfig.configProvider,
      genomeFactoryConfig.stateProvider as never,
      genomeFactoryConfig.genomeOptions,
      genomeFactoryConfig.initConfig,
      genomeOptions
    )
    const phenotype = threadInfo.createPhenotype(genome)

    // Training + fitness scoring in one call — no redundant genome transfer
    return trainGenome(phenotype, env, {
      trainingEpochs,
      learningRate,
      isLamarckian,
    })
  })
}

export default backpropWorkerPlugin
