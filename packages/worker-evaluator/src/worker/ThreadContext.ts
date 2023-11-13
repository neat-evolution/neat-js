import type { GenomeFactoryConfig } from './GenomeFactoryConfig.js'
import type { ThreadInfo } from './ThreadInfo.js'

export interface ThreadContext {
  threadInfo?: ThreadInfo
  genomeFactoryConfig?: GenomeFactoryConfig
}
