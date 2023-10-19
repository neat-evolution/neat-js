import type { StateData, State, LinkKey } from '@neat-js/core'
import { NEATState } from '@neat-js/neat'

import type { CustomStateData } from './CustomStateData.js'

export class CustomState implements State<CustomStateData> {
  public readonly singleCPPNState: NEATState
  public readonly uniqueCPPNStates: Map<LinkKey, NEATState>
  public readonly cppnStateRedirects: Map<LinkKey, LinkKey>

  constructor(factoryOptions?: CustomStateData) {
    this.singleCPPNState = new NEATState(factoryOptions?.singleCPPNState)
    this.uniqueCPPNStates = new Map()
    this.cppnStateRedirects = new Map(factoryOptions?.cppnStateRedirects)

    if (factoryOptions?.uniqueCPPNStates != null) {
      for (const [key, value] of factoryOptions.uniqueCPPNStates) {
        this.uniqueCPPNStates.set(key, new NEATState(value))
      }
    }
  }

  toJSON() {
    const uniqueCPPNStates: Array<[key: string, value: StateData]> = []
    for (const [key, value] of this.uniqueCPPNStates.entries()) {
      uniqueCPPNStates.push([key, value.toJSON()])
    }
    return {
      singleCPPNState: this.singleCPPNState.toJSON(),
      uniqueCPPNStates,
      cppnStateRedirects: Array.from(this.cppnStateRedirects.entries()),
    }
  }
}
