import type { Genome, GenomeData, GenomeOptions } from '@neat-js/core'

import type { PopulationData } from './PopulationData.js'

export type PopulationFactoryOptions<
  GO extends GenomeOptions,
  GD extends GenomeData<GO, G>,
  G extends Genome<any, any, any, any, GO, any, GD, G>
> = Pick<
  PopulationData<GO, GD, G>,
  'state' | 'species' | 'extinctSpecies' | 'nextId'
>
