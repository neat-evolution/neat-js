import type { ConfigData, GenomeOptions, InitConfig } from '@neat-evolution/core'
import type { Environment } from '@neat-evolution/environment'

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
  initGenomeFactory: <CD extends ConfigData>(
    configData: CD,
    genomeOptions: GenomeOptions,
    initConfig: InitConfig
  ) => Promise<void>

  evaluate: (genomeEntries: GenomeEntries<any>) => AsyncIterable<FitnessData>
}
