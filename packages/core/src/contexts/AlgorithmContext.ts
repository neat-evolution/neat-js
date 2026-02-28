import type { BaseContext } from './BaseContext.js'
import type { GenomeTypes } from './GenomeTypes.js'
import type { LinkTypes } from './LinkTypes.js'
import type { NodeTypes } from './NodeTypes.js'

export interface AlgorithmContext
  extends BaseContext,
    NodeTypes,
    LinkTypes,
    GenomeTypes {}
