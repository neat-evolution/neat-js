import type { GenomeOptions } from '@neat-js/core'
import { Activation } from '@neat-js/core'

export interface NEATGenomeOptions extends GenomeOptions {
  outputActivation: Activation
}

export const defaultNEATGenomeOptions: NEATGenomeOptions = {
  inputs: 1,
  outputs: 1,
  outputActivation: Activation.Sigmoid,
}
