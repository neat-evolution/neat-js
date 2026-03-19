import {
  Activation,
  type LinkCoord,
  type NodeCoord,
  type Phenotype,
  type PhenotypeAction,
  PhenotypeActionType,
  type PhenotypeFactory,
  resolveOutputActivation,
  type WritebackPayload,
} from '@neat-evolution/core'
import {
  type CPPNContext,
  type CPPNGenome,
  type CPPNGenomeOptions,
  createPhenotype as createCPPNPhenotype,
} from '@neat-evolution/cppn'
import {
  createExecutor,
  createTrainableExecutor,
  type TrainableExecutor,
} from '@neat-evolution/executor'

import type { HyperNEATGenomeOptions } from './HyperNEATGenomeOptions.js'
import { isSubstrateLinkAction } from './SubstrateAction.js'
import { load } from './substrate/load.js'

export const createPhenotype: PhenotypeFactory<
  CPPNGenome<HyperNEATGenomeOptions>,
  CPPNContext<HyperNEATGenomeOptions>
> = (genome) => {
  const cppnPhenotype = createCPPNPhenotype(
    genome as unknown as CPPNGenome<CPPNGenomeOptions>
  )
  const cppn = createExecutor(cppnPhenotype)
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
  const linkCoords: LinkCoord[] = []
  const nodeCoords: NodeCoord[] = []
  let actionIndex = 0

  for (const action of substrate.actions) {
    if (isSubstrateLinkAction(action)) {
      const { from, to, x0, y0, x1, y1 } = action
      const [weight] = cppn.forward([x0, y0, x1, y1]) as [
        weight: number,
        bias: number,
      ]
      if (Math.abs(weight) > genome.genomeOptions.weightThreshold) {
        linkCoords.push({ actionIndex, x0, y0, x1, y1 })
        actions.push([PhenotypeActionType.Link, from, to, weight])
        actionIndex++
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
      nodeCoords.push({ actionIndex, x, y })
      actions.push([PhenotypeActionType.Activation, node, bias, activation])
      actionIndex++
    }
  }

  // Lazy CPPN TrainableExecutor — only created on first backward call, cached for reuse
  let cppnTrainableExecutor: TrainableExecutor | undefined

  const result: Phenotype = {
    length: substrate.length,
    inputs: [...substrate.inputs],
    outputs: [...substrate.outputs],
    actions,
    coordinateMap: { linkCoords, nodeCoords, cppnPhenotype },
  }

  // Gradient averaging: divide lr by coordinate count so CPPN training rate
  // is independent of substrate size
  const coordinateCount = linkCoords.length + nodeCoords.length
  const cppnLrScale = coordinateCount > 0 ? 1 / coordinateCount : 1
  const baseCppnLr = genome.genomeOptions.cppnLearningRate

  // Pre-allocate error buffers for CPPN backward (avoid per-coordinate allocation)
  const linkError = new Float64Array(2) // [grad, 0] for weight output
  const nodeError = new Float64Array(2) // [0, grad] for bias output

  result.chainBackward = (gradients: Float64Array, lr: number): void => {
    if (cppnTrainableExecutor === undefined) {
      cppnTrainableExecutor = createTrainableExecutor(cppnPhenotype)
    }
    // Accumulate gradients across all coordinates, then apply one coherent update
    cppnTrainableExecutor.zeroGradients()
    for (const lc of linkCoords) {
      const grad = gradients[lc.actionIndex]
      if (grad === undefined || grad === 0) continue
      cppnTrainableExecutor.forward([lc.x0, lc.y0, lc.x1, lc.y1])
      linkError[0] = grad
      cppnTrainableExecutor.accumulateBackward(linkError)
    }
    for (const nc of nodeCoords) {
      const grad = gradients[nc.actionIndex]
      if (grad === undefined || grad === 0) continue
      cppnTrainableExecutor.forward([0.0, 0.0, nc.x, nc.y])
      nodeError[1] = grad
      cppnTrainableExecutor.accumulateBackward(nodeError)
    }
    cppnTrainableExecutor.applyGradients((baseCppnLr ?? lr) * cppnLrScale)
  }

  result.transformWriteback = (): WritebackPayload | undefined => {
    if (cppnTrainableExecutor === undefined) return undefined
    return cppnTrainableExecutor.getUpdatedActions()
  }

  return result
}
