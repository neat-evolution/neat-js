import type { ConfigData, GenomeOptions, InitConfig } from '@neat-js/core'
import type { Environment } from '@neat-js/environment'

import type { GenomeEntries } from './GenomeEntries.js'

export type FitnessData = [
  speciesIndex: number,
  organismIndex: number,
  fitness: number
]

export interface Evaluator {
  environment: Environment
  /**
   * Used by worker-evaluator to hydrate the genome within the worker.
   * @param {ConfigData<any, any>} configData data from population.configProvider.toJSON()
   * @param {GenomeOptions} genomeOptions genome options from population.genomeOptions
   * @param {InitConfig} initConfig initConfig from population.initConfig
   * @returns {Promise<void>} void
   */
  initGenomeFactory: (
    configData: ConfigData<any, any>,
    genomeOptions: GenomeOptions,
    initConfig: InitConfig
  ) => Promise<void>
  evaluate: (genomeEntries: GenomeEntries<any>) => AsyncIterable<FitnessData>
}
