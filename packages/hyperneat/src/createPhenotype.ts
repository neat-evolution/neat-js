import {
  Activation,
  type PhenotypeAction,
  PhenotypeActionType,
  type PhenotypeFactory,
  resolveOutputActivation,
} from '@neat-evolution/core'
import {
  type CPPNContext,
  type CPPNGenome,
  type CPPNGenomeOptions,
  createPhenotype as createCPPNPhenotype,
} from '@neat-evolution/cppn'
import { createExecutor } from '@neat-evolution/executor'

import type { HyperNEATGenomeOptions } from './HyperNEATGenomeOptions.js'
import { isSubstrateLinkAction } from './SubstrateAction.js'
import { load } from './substrate/load.js'

export const createPhenotype: PhenotypeFactory<
  CPPNGenome<HyperNEATGenomeOptions>,
  CPPNContext<HyperNEATGenomeOptions>
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
      const [weight] = cppn.forward([x0, y0, x1, y1]) as [
        weight: number,
        bias: number,
      ]
      if (Math.abs(weight) > genome.genomeOptions.weightThreshold) {
        actions.push([PhenotypeActionType.Link, from, to, weight])
      }
    } else {
      const { node, x, y } = action
      const [, bias] = cppn.forward([0.0, 0.0, x, y]) as [
        weight: number,
        bias: number,
      ]
      let activation: Activation
      if (substrate.inputs.includes(node)) {
        activation = Activation.None
      } else {
        const outputIndex = substrate.outputs.indexOf(node)
        if (outputIndex >= 0) {
          activation = resolveOutputActivation(
            genome.genomeOptions.outputActivation,
            outputIndex
          )
        } else {
          activation = genome.genomeOptions.hiddenActivation
        }
      }
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
