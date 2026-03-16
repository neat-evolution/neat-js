import type { EnvironmentFactory } from '@neat-evolution/environment'

import { DatasetEnvironment } from './DatasetEnvironment.js'
import { datasetFromSharedBuffer } from './datasetFromSharedBuffer.js'

export const createEnvironment: EnvironmentFactory<SharedArrayBuffer | null> = (
  environmentData,
  initOptions
) => {
  if (environmentData == null) {
    throw new Error('Environment data must be provided')
  }
  const dataset = datasetFromSharedBuffer(environmentData)
  const environment = new DatasetEnvironment(dataset, initOptions)
  return environment
}
