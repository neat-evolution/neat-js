import {
  CoreState,
  type ExtendedState,
  type InnovationKey,
  type LinkKey,
  type NodeKey,
  type StateData,
} from '@neat-evolution/core'

import { StateType } from './actions.js'
import { WorkerCustomState } from './WorkerCustomState.js'
import type { ReproducerHandlerContext } from './worker/ThreadContext.js'

export type GetSplitInnovationFn = (
  innovationKey: InnovationKey,
  stateType: StateType,
  stateKey: LinkKey | null,
  context: ReproducerHandlerContext
) => Promise<NodeKey>

export type GetConnectInnovationFn = (
  from: NodeKey,
  to: NodeKey,
  stateType: StateType,
  stateKey: LinkKey | null,
  context: ReproducerHandlerContext
) => Promise<InnovationKey>

export type SetCPPNStateRedirectFn = (
  key: LinkKey,
  oldKey: LinkKey,
  context: ReproducerHandlerContext
) => void

export class WorkerState<
  NSD = unknown,
  LSD = unknown,
  NS extends ExtendedState<NSD> = ExtendedState<NSD>,
  LS extends ExtendedState<LSD> = ExtendedState<LSD>,
  SD extends StateData = StateData,
> extends CoreState<NSD, LSD, NS, LS, SD> {
  public readonly stateType: StateType
  public readonly stateKey: LinkKey | null
  public readonly enableCustomState: boolean
  public readonly custom: WorkerCustomState | null

  protected readonly context: ReproducerHandlerContext

  constructor(
    setCPPNStateRedirectFn: SetCPPNStateRedirectFn,
    context: ReproducerHandlerContext,
    stateType: StateType = StateType.NEAT,
    stateKey: LinkKey | null = null,
    enableCustomState: boolean = false,
    singleCPPNState: boolean | undefined
  ) {
    super()
    this.context = context

    this.enableCustomState = enableCustomState
    this.stateType = stateType
    this.stateKey = stateKey

    if (enableCustomState) {
      this.custom = new WorkerCustomState(
        singleCPPNState === true,
        setCPPNStateRedirectFn,
        this.context
      )
    } else {
      this.custom = null
    }
  }

  override node(): NS {
    return (this.enableCustomState ? this.custom : null) as NS
  }

  override link(): LS {
    return (this.enableCustomState ? this.custom : null) as LS
  }

  override toJSON(): SD {
    return {
      neat: null,
    } as unknown as SD
  }
}
