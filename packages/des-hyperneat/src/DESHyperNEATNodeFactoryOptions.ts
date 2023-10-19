import type { NodeFactoryOptions } from '@neat-js/core'
import { CPPNGenome } from '@neat-js/cppn'
import type { CPPNGenomeFactoryOptions, CPPNGenomeOptions } from '@neat-js/cppn'

export const isCPPNGenome = (
  cppn: CPPNGenomeFactoryOptions | CPPNGenome<CPPNGenomeOptions>
): cppn is CPPNGenome<CPPNGenomeOptions> => {
  return cppn instanceof CPPNGenome
}

export interface DESHyperNEATNodeFactoryOptions extends NodeFactoryOptions {
  cppn?: CPPNGenomeFactoryOptions | CPPNGenome<CPPNGenomeOptions>
  depth?: number
}
