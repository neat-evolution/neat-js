import type { NodeFactoryOptions } from '@neat-evolution/core'
import { CPPNGenome } from '@neat-evolution/cppn'
import type { CPPNGenomeFactoryOptions, CPPNGenomeOptions } from '@neat-evolution/cppn'

export const isCPPNGenome = (
  cppn: CPPNGenomeFactoryOptions | CPPNGenome<CPPNGenomeOptions>
): cppn is CPPNGenome<CPPNGenomeOptions> => {
  return cppn instanceof CPPNGenome
}

export interface DESHyperNEATNodeFactoryOptions extends NodeFactoryOptions {
  cppn?: CPPNGenomeFactoryOptions | CPPNGenome<CPPNGenomeOptions>
  depth?: number
}
