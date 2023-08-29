import * as workerpool from 'workerpool'

import type { FitnessData, PhenotypeData } from '@neat-js/evaluator'
import type { Environment } from '@neat-js/evolution'
import type { ExecutorFactory } from '@neat-js/executor'

const evaluateTask = async <G, E extends Environment>(
  task: PhenotypeData
): Promise<FitnessData> => {
  const EnvironmentModule = await import(modulePaths.envPath)
  const Environment: E = EnvironmentModule.default

  const DeveloperModule = await import(modulePaths.devPath)
  const Developer: ExecutorFactory = DeveloperModule.default

  const environment = new Environment()
  const developer = new Developer()

  const [speciesIndex, organismIndex, genome] = task
  const [phenotype, phenotypeStats] = developer.develop(genome)
  const [fitness, evaluationStats] = environment.evaluate(phenotype)

  return [speciesIndex, organismIndex, fitness, phenotypeStats, evaluationStats]
}

// Register the task function with workerpool
workerpool.worker({
  evaluateTask,
})
