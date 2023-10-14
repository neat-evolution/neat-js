import { nodeRefToKey, type NodeRef } from '@neat-js/core'
import {
  CPPNAlgorithm,
  type CPPNGenome,
  type CPPNGenomeOptions,
} from '@neat-js/cppn'

export const insertLink = (
  genome: CPPNGenome<CPPNGenomeOptions>,
  from: NodeRef,
  to: NodeRef,
  weight: number
): void => {
  const innovation = genome.state.getConnectInnovation(from, to)
  const neatLink = CPPNAlgorithm.createLink(
    { from: nodeRefToKey(from), to: nodeRefToKey(to), weight, innovation },
    null,
    null
  )
  genome.insertLink(neatLink)
}
