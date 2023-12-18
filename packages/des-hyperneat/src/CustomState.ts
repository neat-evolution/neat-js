import type { StateData, State, LinkKey } from '@neat-evolution/core'
import { CPPNAlgorithm } from '@neat-evolution/cppn'
import { NEATState } from '@neat-evolution/neat'

import type { CustomStateData } from './CustomStateData.js'

export class CustomState implements State<CustomStateData> {
  public readonly singleCPPNState: NEATState
  public readonly uniqueCPPNStates: Map<LinkKey, NEATState>
  public readonly cppnStateRedirects: Map<LinkKey, LinkKey>

  constructor(factoryOptions?: CustomStateData) {
    this.singleCPPNState = new NEATState()
    this.uniqueCPPNStates = new Map<LinkKey, NEATState>()
    this.cppnStateRedirects = new Map<LinkKey, LinkKey>(
      factoryOptions?.cppnStateRedirects
    )

    if (factoryOptions?.uniqueCPPNStates != null) {
      for (const [key] of factoryOptions.uniqueCPPNStates) {
        this.uniqueCPPNStates.set(key, new NEATState())
      }
    }
  }

  getKey(key: LinkKey): LinkKey {
    return this.cppnStateRedirects.get(key) ?? key
  }

  getState(key: LinkKey, singleCPPNState: boolean): NEATState | undefined {
    if (singleCPPNState) {
      return this.singleCPPNState
    }
    return this.uniqueCPPNStates.get(this.getKey(key))
  }

  getOrCreateState(key: LinkKey, singleCPPNState: boolean): NEATState {
    if (singleCPPNState) {
      return this.singleCPPNState
    }
    const cppnStateKey = this.getKey(key)
    let state = this.uniqueCPPNStates.get(cppnStateKey)
    if (state == null) {
      state = CPPNAlgorithm.createState()
      this.uniqueCPPNStates.set(cppnStateKey, state)
    }
    return state
  }

  setState(key: LinkKey, state: NEATState): void {
    const cppnStateKey = this.getKey(key)
    if (!this.uniqueCPPNStates.has(cppnStateKey)) {
      this.uniqueCPPNStates.set(cppnStateKey, state)
    }
  }

  cloneState(key: LinkKey, oldKey: LinkKey): void {
    if (!this.cppnStateRedirects.has(key)) {
      this.cppnStateRedirects.set(key, this.getKey(oldKey))
      this.uniqueCPPNStates.delete(key)
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
