import type { LinkFactoryOptions } from '@neat-evolution/core'
import type {
  CPPNGenome,
  CPPNGenomeFactoryOptions,
  CPPNGenomeOptions,
} from '@neat-evolution/cppn'

export interface DESHyperNEATLinkFactoryOptions extends LinkFactoryOptions {
  cppn?: CPPNGenomeFactoryOptions | CPPNGenome<CPPNGenomeOptions>
  depth?: number
}
