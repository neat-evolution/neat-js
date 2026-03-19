import {
  type Algorithm,
  isActionEdge,
  isActionNode,
  NodeType,
  nodeKeyToType,
} from '@neat-evolution/core'
import type { CPPNGenome, CPPNGenomeOptions } from '@neat-evolution/cppn'
import { writeBackWeights as writeCPPNWeights } from '@neat-evolution/cppn'
import type { PopulationCreator } from '@neat-evolution/evolution'
import { Population } from '@neat-evolution/evolution'

import { createConfig } from './createConfig.js'
import { createGenome } from './createGenome.js'
import { createPhenotype } from './createPhenotype.js'
import { createState } from './createState.js'
import type { DESHyperNEATContext } from './DESHyperNEATContext.js'
import { defaultDESHyperNEATGenomeOptions } from './DESHyperNEATGenomeOptions.js'
import { topologyInitConfig } from './topology/topologyInitConfig.js'

export const DESHyperNEATAlgorithm: Algorithm<DESHyperNEATContext> &
  PopulationCreator<DESHyperNEATContext> = {
  name: 'DES-HyperNEAT',
  pathname: '@neat-evolution/des-hyperneat',
  defaultOptions: defaultDESHyperNEATGenomeOptions,
  usesCPPNActivations: true,
  enableCustomState: true,
  createConfig,
  createGenome,
  createPhenotype,
  createState,

  writeBackWeights(genome, payload) {
    // Top-level DES genome writeback (link weights + node biases)
    writeCPPNWeights(
      genome as unknown as CPPNGenome<CPPNGenomeOptions>,
      payload.actions
    )

    // Per-sub-CPPN writeback via auxiliary data
    if (payload.auxiliary != null && payload.auxiliary.length > 0) {
      // Build key → sub-CPPN genome mapping by walking the same topological
      // order used during createPhenotype assembly
      const auxiliaryMap = new Map(payload.auxiliary)
      const order = genome.connections.sortTopologically()
      let subKey = 0
      for (const action of order) {
        if (isActionEdge(action)) {
          const [sourceKey, targetKey] = action
          const subActions = auxiliaryMap.get(subKey)
          if (subActions != null) {
            const subCPPN = genome.getLinkCPPN(sourceKey, targetKey)
            if (subCPPN != null) {
              writeCPPNWeights(
                subCPPN as CPPNGenome<CPPNGenomeOptions>,
                subActions
              )
            }
          }
          subKey++
        } else if (isActionNode(action)) {
          const [nodeKey] = action
          const depth = genome.getDepth(nodeKey)
          if (depth != null && depth > 0) {
            const subActions = auxiliaryMap.get(subKey)
            if (subActions != null) {
              const nodeType = nodeKeyToType(nodeKey)
              if (nodeType !== NodeType.Input) {
                const subCPPN = genome.getNodeCPPN(nodeKey)
                if (subCPPN != null) {
                  writeCPPNWeights(
                    subCPPN as CPPNGenome<CPPNGenomeOptions>,
                    subActions
                  )
                }
              }
            }
            subKey++
          }
        }
      }
    }

    // Apply node bias deltas to genome nodes
    if (payload.nodeBiasDeltas != null) {
      for (const [nodeKey, delta] of payload.nodeBiasDeltas) {
        const node = genome.getNodeByKey(nodeKey)
        if (node != null) {
          node.bias += delta
        }
      }
    }
  },

  createPopulation(
    createReproducer,
    evaluator,
    configData,
    populationOptions,
    genomeOptions,
    populationFactoryOptions
  ) {
    const configProvider = DESHyperNEATAlgorithm.createConfig(configData)
    // capture the real initConfig for createPhenotype later
    genomeOptions.initConfig = evaluator.environment.description
    // choose initConfig based on topology config options
    const initConfig = topologyInitConfig(
      evaluator.environment.description,
      genomeOptions
    )
    return new Population<DESHyperNEATContext>(
      createReproducer,
      evaluator,
      DESHyperNEATAlgorithm,
      configProvider,
      populationOptions,
      genomeOptions,
      initConfig,
      populationFactoryOptions
    )
  },
}
