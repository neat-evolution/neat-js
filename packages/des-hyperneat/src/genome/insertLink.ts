import { type NodeKey } from '@neat-evolution/core'
import { type CPPNGenome, type CPPNGenomeOptions } from '@neat-evolution/cppn'

export const insertLink = async (
  genome: CPPNGenome<CPPNGenomeOptions>,
  from: NodeKey,
  to: NodeKey,
  weight: number
): Promise<void> => {
  const innovation = await genome.state.getConnectInnovation(from, to)
  const neatLink = genome.createLink(
    { from, to, weight, innovation },
    null,
    null
  )
  genome.insertLink(neatLink)
}
