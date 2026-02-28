import type { AlgorithmContext } from '../contexts/AlgorithmContext.js'
import type { StateDataOf, StateTypeOf } from '../contexts/helpers.js'

export type StateFactory<Ctx extends AlgorithmContext> = (
  factoryOptions?: StateDataOf<Ctx>
) => StateTypeOf<Ctx>
