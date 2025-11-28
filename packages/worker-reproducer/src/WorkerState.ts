import {
  type StateData,
  type ExtendedState,
  type LinkKey,
  type NodeKey,
  type InnovationKey,
  CoreState,
} from '@neat-evolution/core'

import { StateType } from './actions.js'
import type { ReproducerHandlerContext } from './worker/ThreadContext.js'
import { WorkerCustomState } from './WorkerCustomState.js'

export type GetSplitInnovationFn = (
  innovationKey: InnovationKey,
  stateType: StateType,
  stateKey: string | null,
  context: ReproducerHandlerContext
) => Promise<NodeKey>

export type GetConnectInnovationFn = (
  from: NodeKey,
  to: NodeKey,
  stateType: StateType,
  stateKey: string | null,
  context: ReproducerHandlerContext
) => Promise<InnovationKey>

export type SetCPPNStateRedirectFn = (
  key: LinkKey,
  oldKey: LinkKey,
  context: ReproducerHandlerContext
) => void

export class WorkerState<
  NSD,
  LSD,
  NS extends ExtendedState<NSD>,
  LS extends ExtendedState<LSD>,
  SD extends StateData,
> extends CoreState<NSD, LSD, NS, LS, SD> {
  public readonly stateType: StateType
  public readonly stateKey: string | null
  public readonly enableCustomState: boolean
  public readonly custom: WorkerCustomState | null

  protected readonly context: ReproducerHandlerContext

  constructor(
    setCPPNStateRedirectFn: SetCPPNStateRedirectFn,
    context: ReproducerHandlerContext,
    stateType: StateType = StateType.NEAT,
    stateKey: string | null = null,
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
