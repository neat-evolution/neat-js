import {
  type Innovation,
  type StateProvider,
  type StateData,
  type ExtendedState,
  type NEATState,
  InnovationLog,
  type LinkKey,
  type NodeKey,
} from '@neat-js/core'

import { StateType } from './WorkerAction.js'
import { WorkerCustomState } from './WorkerCustomState.js'

export type GetSplitInnovationFn = (
  linkInnovation: number,
  stateType: StateType,
  stateKey: string | null
) => Promise<Innovation>
export type GetConnectInnovationFn = (
  from: NodeKey,
  to: NodeKey,
  stateType: StateType,
  stateKey: string | null
) => Promise<number>

export type SetCPPNStateRedirectFn = (key: LinkKey, oldKey: LinkKey) => void

export class WorkerState<
  NSD,
  LSD,
  NS extends ExtendedState<NSD>,
  LS extends ExtendedState<LSD>,
  SD extends StateData
> implements StateProvider<NSD, LSD, NS, LS, SD>
{
  public readonly stateType: StateType
  public readonly stateKey: string | null
  public readonly innovationLog: InnovationLog
  public readonly nextInnovation: Innovation
  public readonly enableCustomState: boolean
  public readonly custom: WorkerCustomState | null

  protected readonly getSplitInnovationFn: GetSplitInnovationFn
  protected readonly getConnectInnovationFn: GetConnectInnovationFn

  constructor(
    getSplitInnovationFn: GetSplitInnovationFn,
    getConnectInnovationFn: GetConnectInnovationFn,
    setCPPNStateRedirectFn: SetCPPNStateRedirectFn,
    stateType: StateType = StateType.NEAT,
    stateKey: string | null = null,
    enableCustomState: boolean = false,
    singleCPPNState: boolean | undefined
  ) {
    this.getSplitInnovationFn = getSplitInnovationFn
    this.getConnectInnovationFn = getConnectInnovationFn
    this.enableCustomState = enableCustomState
    this.stateType = stateType
    this.stateKey = stateKey

    if (enableCustomState) {
      this.custom = new WorkerCustomState(
        singleCPPNState === true,
        getSplitInnovationFn,
        getConnectInnovationFn,
        setCPPNStateRedirectFn
      )
    } else {
      this.custom = null
    }
    // dummy internal structure, do not use
    this.innovationLog = new InnovationLog()
    this.nextInnovation = {
      nodeNumber: 0,
      innovationNumber: 0,
    }
  }

  async getSplitInnovation(linkInnovation: number): Promise<Innovation> {
    return await this.getSplitInnovationFn(
      linkInnovation,
      this.stateType,
      this.stateKey
    )
  }

  async getConnectInnovation(from: NodeKey, to: NodeKey): Promise<number> {
    return await this.getConnectInnovationFn(
      from,
      to,
      this.stateType,
      this.stateKey
    )
  }

  neat(): NEATState {
    return this
  }

  node(): NS {
    return (this.enableCustomState ? this.custom : null) as NS
  }

  link(): LS {
    return (this.enableCustomState ? this.custom : null) as LS
  }

  toJSON(): SD {
    return {
      neat: {
        innovationLog: this.innovationLog.toJSON(),
        nextInnovation: this.nextInnovation,
      },
    } as unknown as SD
  }
}
