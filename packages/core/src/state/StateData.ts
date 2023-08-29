import type { LinkState, NodeState } from './ExtendedState.js'
import type { Innovation, InnovationLogData } from './InnovationLog.js'

export interface StateData<NS extends NodeState, LS extends LinkState> {
  neat: {
    innovationLog: InnovationLogData
    nextInnovation: Innovation
  }
  node: NS
  link: LS
}
