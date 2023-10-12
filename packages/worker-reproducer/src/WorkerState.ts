import {
  type Innovation,
  type NodeRef,
  type StateProvider,
  type StateData,
  type ExtendedState,
  type NEATState,
  InnovationLog,
} from '@neat-js/core'

type GetSplitInnovationFn = (linkInnovation: number) => Promise<Innovation>
type GetConnectInnovationFn = (from: NodeRef, to: NodeRef) => Promise<number>

export class WorkerState<
  NSD,
  LSD,
  NS extends ExtendedState<NSD>,
  LS extends ExtendedState<LSD>,
  SD extends StateData
> implements StateProvider<NSD, LSD, NS, LS, SD>
{
  public readonly innovationLog: InnovationLog
  public readonly nextInnovation: Innovation

  protected readonly getSplitInnovationFn: GetSplitInnovationFn
  protected readonly getConnectInnovationFn: GetConnectInnovationFn

  constructor(
    getSplitInnovationFn: GetSplitInnovationFn,
    getConnectInnovationFn: GetConnectInnovationFn,
    _stateFactoryOptions?: SD
  ) {
    this.getSplitInnovationFn = getSplitInnovationFn
    this.getConnectInnovationFn = getConnectInnovationFn
    this.innovationLog = new InnovationLog()
    this.nextInnovation = {
      nodeNumber: 0,
      innovationNumber: 0,
    }
  }

  async getSplitInnovation(linkInnovation: number): Promise<Innovation> {
    return await this.getSplitInnovationFn(linkInnovation)
  }

  async getConnectInnovation(from: NodeRef, to: NodeRef): Promise<number> {
    return await this.getConnectInnovationFn(from, to)
  }

  neat(): NEATState {
    return this
  }

  node(): NS {
    // throw new Error('Not implemented')
    // @ts-expect-error not implemented custom state
    return null // this.nodeState
  }

  link(): LS {
    // throw new Error('Not implemented')
    // @ts-expect-error not implemented custom state
    return null // this.linkState
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
