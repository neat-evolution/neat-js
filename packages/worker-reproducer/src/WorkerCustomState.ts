import {
  type StateData,
  type State,
  type LinkKey,
  type NEATState,
} from '@neat-evolution/core'

import type { ThreadContext } from './worker/ThreadContext.js'
import { StateType } from './WorkerAction.js'
import {
  WorkerState,
  type GetSplitInnovationFn,
  type GetConnectInnovationFn,
  type SetCPPNStateRedirectFn,
} from './WorkerState.js'

export class WorkerCustomState implements State<undefined> {
  public readonly isSingleState: boolean
  public readonly singleCPPNState: WorkerState<
    null,
    null,
    null,
    null,
    StateData
  >

  public readonly uniqueCPPNStates: Map<
    LinkKey,
    WorkerState<null, null, null, null, StateData>
  >

  protected readonly getSplitInnovationFn: GetSplitInnovationFn
  protected readonly getConnectInnovationFn: GetConnectInnovationFn
  protected readonly setCPPNStateRedirectFn: SetCPPNStateRedirectFn

  protected readonly context: ThreadContext

  constructor(
    isSingleState: boolean = false,
    getSplitInnovationFn: GetSplitInnovationFn,
    getConnectInnovationFn: GetConnectInnovationFn,
    setCPPNStateRedirectFn: SetCPPNStateRedirectFn,
    context: ThreadContext
  ) {
    this.isSingleState = isSingleState
    this.getSplitInnovationFn = getSplitInnovationFn
    this.getConnectInnovationFn = getConnectInnovationFn
    this.setCPPNStateRedirectFn = setCPPNStateRedirectFn
    this.context = context

    this.singleCPPNState = new WorkerState(
      getSplitInnovationFn,
      getConnectInnovationFn,
      setCPPNStateRedirectFn,
      context,
      StateType.SINGLE_CPPN_STATE,
      null,
      false,
      undefined
    )

    this.uniqueCPPNStates = new Map<
      LinkKey,
      WorkerState<null, null, null, null, StateData>
    >()
  }

  // getKey -- parrots key
  getKey(key: LinkKey): LinkKey {
    return key
  }

  // getState -- same as getOrCreateState
  getState(key: LinkKey, singleCPPNState: boolean): NEATState | undefined {
    return this.getOrCreateState(key, singleCPPNState)
  }

  // getOrCreateState -- returns a WorkerState instance by key; creates if missing
  getOrCreateState(key: LinkKey, singleCPPNState: boolean): NEATState {
    if (singleCPPNState) {
      return this.singleCPPNState
    }
    let state = this.uniqueCPPNStates.get(key)
    if (state == null) {
      state = new WorkerState(
        this.getSplitInnovationFn,
        this.getConnectInnovationFn,
        this.setCPPNStateRedirectFn,
        this.context,
        StateType.UNIQUE_CPPN_STATES,
        key,
        false,
        undefined
      )
      this.uniqueCPPNStates.set(key, state)
    }
    return state
  }

  // setState -- we handle this gracefully in the main thread
  setState(key: LinkKey, state: NEATState): void {
    if (!this.uniqueCPPNStates.has(key)) {
      if (!(state instanceof WorkerState)) {
        throw new Error('Invalid state')
      } else {
        this.uniqueCPPNStates.set(key, state)
      }
    }
  }

  // cloneState -- needs wacky async behavior to communicate with main thread
  cloneState(key: LinkKey, oldKey: LinkKey): void {
    // communicate with the main thread; we don't wait for a response at all
    this.setCPPNStateRedirectFn(key, oldKey, this.context)

    // save a reference to the old state if it exists; ensures that setState is a noop
    const oldState = this.uniqueCPPNStates.get(oldKey)
    if (oldState != null) {
      this.uniqueCPPNStates.set(key, oldState)
    }
  }

  toJSON(): undefined {
    throw new Error('Not implemented.')
  }
}
