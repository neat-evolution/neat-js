import type { Genome, GenomeData } from './Genome.js'
import type { GenomeOptions } from './GenomeOptions.js'

export type GenomeFactory<
  O extends GenomeOptions,
  G extends Genome<any, any, any, O, G>,
  D extends GenomeData<any, any, any, O, G>
> = (
  config: G['config'], // NEATOptions
  options: O,
  state: G['state'],
  data?: D
) => G
