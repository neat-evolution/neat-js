import type { StateData, LinkKey } from '@neat-evolution/core'

export interface CustomStateData {
  singleCPPNState: StateData
  uniqueCPPNStates: Array<[key: LinkKey, value: StateData]>
  cppnStateRedirects: Array<[key: LinkKey, value: LinkKey]>
}
