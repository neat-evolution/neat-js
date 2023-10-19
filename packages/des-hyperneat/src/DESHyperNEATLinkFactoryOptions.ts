import type { LinkFactoryOptions } from '@neat-js/core'
import type {
  CPPNGenome,
  CPPNGenomeFactoryOptions,
  CPPNGenomeOptions,
} from '@neat-js/cppn'

export interface DESHyperNEATLinkFactoryOptions extends LinkFactoryOptions {
  cppn?: CPPNGenomeFactoryOptions | CPPNGenome<CPPNGenomeOptions>
  depth?: number
}
