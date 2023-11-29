import {
  Activation,
  PhenotypeActionType,
  type PhenotypeAction,
  type PhenotypeFactory,
} from '@neat-evolution/core'
import {
  type CPPNGenome,
  createPhenotype as createCPPNPhenotype,
  type CPPNGenomeOptions,
} from '@neat-evolution/cppn'
import { createExecutor } from '@neat-evolution/executor'

import type { HyperNEATGenomeOptions } from './HyperNEATGenomeOptions.js'
import { load } from './substrate/load.js'
import { isSubstrateLinkAction } from './SubstrateAction.js'

export const createPhenotype: PhenotypeFactory<
  CPPNGenome<HyperNEATGenomeOptions>
> = (genome) => {
  const phenotype = createCPPNPhenotype(
    genome as unknown as CPPNGenome<CPPNGenomeOptions>
  )
  const cppn = createExecutor(phenotype)
  const initConfig = genome.genomeOptions.initConfig
  if (initConfig == null) {
    throw new Error('initConfig is required')
  }
  const substrate = load(
    initConfig.inputs,
    initConfig.outputs,
    genome.genomeOptions
  )
  const actions: PhenotypeAction[] = []

  for (const action of substrate.actions) {
    if (isSubstrateLinkAction(action)) {
      const { from, to, x0, y0, x1, y1 } = action
      const [weight] = cppn.execute([x0, y0, x1, y1]) as [
        weight: number,
        bias: number,
      ]
      if (Math.abs(weight) > genome.genomeOptions.weightThreshold) {
        actions.push([PhenotypeActionType.Link, from, to, weight])
      }
    } else {
      const { node, x, y } = action
      const [, bias] = cppn.execute([0.0, 0.0, x, y]) as [
        weight: number,
        bias: number,
      ]
      const activation = substrate.inputs.includes(node)
        ? Activation.None
        : substrate.outputs.includes(node)
          ? genome.genomeOptions.outputActivation
          : genome.genomeOptions.hiddenActivation
      actions.push([PhenotypeActionType.Activation, node, bias, activation])
    }
  }

  return {
    length: substrate.length,
    inputs: [...substrate.inputs],
    outputs: [...substrate.outputs],
    actions,
  }
}
