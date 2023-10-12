import type { EnvironmentFactory } from '@neat-js/environment'

import { DatasetEnvironment } from './DatasetEnvironment.js'
import { datasetFromSharedBuffer } from './datasetFromSharedBuffer.js'

export const createEnvironment: EnvironmentFactory = (
  environmentData: SharedArrayBuffer | null
) => {
  if (environmentData == null) {
    throw new Error('Environment data must be provided')
  }
  const dataset = datasetFromSharedBuffer(environmentData)
  const environment = new DatasetEnvironment(dataset)
  return environment
}
