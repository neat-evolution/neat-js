import type { Genome } from './Genome.js'
import type { GenomeOptions } from './GenomeOptions.js'

export interface GenomeFactoryOptions {
  /** indicates that this was cloned from a genome without cycles */
  isSafe?: boolean
}

export type GenomeFactory<
  O extends GenomeOptions,
  FO extends GenomeFactoryOptions,
  G extends Genome<any, any, any, O, FO, G>
> = (
  config: G['config'], // NEATOptions
  options: O,
  state: G['state'],
  factoryOptions?: FO
) => G
