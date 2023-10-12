import type { Innovation, InnovationLogData } from './InnovationLog.js'

export interface NEATStateData {
  innovationLog: InnovationLogData
  nextInnovation: Innovation
}

export interface StateData {
  neat: NEATStateData
}
