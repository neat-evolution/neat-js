import type {
  Genome,
  GenomeData,
  GenomeFactoryOptions,
  GenomeOptions,
} from '@neat-js/core'

/**
 * Used between the `Species` and `Population` classes to parse the genome data
 * See `Population` for implementation
 * See `Species` for usage
 */
export type GenomeDataParser<
  GO extends GenomeOptions,
  FO extends GenomeFactoryOptions,
  G extends Genome<any, any, any, GO, FO, G>,
  GD extends GenomeData<any, any, any, GO, FO, G>
> = (genomeData: GD) => G
