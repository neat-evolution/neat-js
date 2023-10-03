import {
  type NodeState,
  type LinkState,
  type StateFactoryOptions,
  type Innovation,
  type NodeRef,
  type StateProvider,
  type StateData,
} from '@neat-js/core'

type GetSplitInnovationFn = (linkInnovation: number) => Promise<Innovation>
type GetConnectInnovationFn = (from: NodeRef, to: NodeRef) => Promise<number>

export class WorkerState<NS extends NodeState, LS extends LinkState>
  implements StateProvider<NS, LS, WorkerState<NS, LS>>
{
  /** only used in DES-HyperNEAT */
  public readonly nodeState: NS

  /** only used in DES-HyperNEAT */
  public readonly linkState: LS

  protected readonly getSplitInnovationFn: GetSplitInnovationFn
  protected readonly getConnectInnovationFn: GetConnectInnovationFn

  constructor(
    getSplitInnovationFn: GetSplitInnovationFn,
    getConnectInnovationFn: GetConnectInnovationFn,
    nodeState: NS,
    linkState: LS,
    _stateFactoryOptions?: StateFactoryOptions<NS, LS>
  ) {
    this.getSplitInnovationFn = getSplitInnovationFn
    this.getConnectInnovationFn = getConnectInnovationFn
    this.nodeState = nodeState
    this.linkState = linkState
  }

  async getSplitInnovation(linkInnovation: number): Promise<Innovation> {
    return await this.getSplitInnovationFn(linkInnovation)
  }

  async getConnectInnovation(from: NodeRef, to: NodeRef): Promise<number> {
    return await this.getConnectInnovationFn(from, to)
  }

  neat(): this {
    return this
  }

  node(): NS {
    // FIXME: how to support in worker thread?
    return this.nodeState
  }

  link(): LS {
    // FIXME: how to support in worker thread?
    return this.linkState
  }

  toJSON(): StateData<NS, LS> {
    return {
      neat: {
        innovationLog: {
          hiddenNodeInnovations: [],
          splitInnovations: [],
          connectInnovations: [],
          reverseConnectInnovations: [],
        },
        nextInnovation: {
          nodeNumber: -1,
          innovationNumber: -1,
        },
      },
      node: this.nodeState,
      link: this.linkState,
    }
  }
}
