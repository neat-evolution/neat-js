import {
  Activation,
  CoreNode,
  type NodeData,
  NodeType,
} from '@neat-evolution/core'
import type { RNG } from '@neat-evolution/utils'

import type { CPPNContext } from './CPPNContext.js'
import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'
import type { CPPNNodeOptions } from './CPPNNodeOptions.js'
import { createNode } from './createNode.js'

/**
 * Pick a random activation for a CPPN node based on its type.
 * Input nodes always get `Activation.None`.
 */
export function pickActivation(
  type: NodeType,
  nodeOptions: CPPNNodeOptions,
  rng: RNG
): Activation {
  switch (type) {
    case NodeType.Input:
      return Activation.None
    case NodeType.Hidden:
      return nodeOptions.hiddenActivations[
        rng.genIntRange(0, nodeOptions.hiddenActivations.length)
      ] as Activation
    case NodeType.Output:
      return nodeOptions.outputActivations[
        rng.genIntRange(0, nodeOptions.outputActivations.length)
      ] as Activation
    default:
      throw new Error('Invalid NodeRef type')
  }
}

export class CPPNNode extends CoreNode<CPPNContext> {
  public activation: Activation

  public nodeOptions: CPPNNodeOptions

  constructor(
    factoryOptions: CPPNNodeFactoryOptions,
    nodeOptions: CPPNNodeOptions
  ) {
    super(factoryOptions, null, null, createNode)
    this.nodeOptions = nodeOptions
    if (factoryOptions.activation == null) {
      throw new Error(
        'CPPNNode requires activation in factory options — use pickActivation() before construction'
      )
    }
    this.activation = factoryOptions.activation
  }

  /**
   * Decorate a CPPNNodeFactoryOptions object as a CPPNNode by setting its
   * prototype. The factoryOptions already has { type, id, bias, activation };
   * config/state/createNode/nodeOptions come from assignment. Zero allocation
   * for the node shell — the factory options object IS the node.
   */
  static from(
    factoryOptions: CPPNNodeFactoryOptions,
    nodeOptions: CPPNNodeOptions
  ): CPPNNode {
    const node = factoryOptions as unknown as CPPNNode
    Object.setPrototypeOf(node, CPPNNode.prototype)
    const init = node as unknown as {
      config: null
      state: null
      createNode: typeof createNode
    }
    init.config = null
    init.state = null
    init.createNode = createNode
    node.nodeOptions = nodeOptions
    node.bias = node.bias ?? 0
    if (node.activation === undefined) {
      throw new Error(
        'CPPNNode.from requires activation in factory options — use pickActivation() before construction'
      )
    }
    return node
  }

  override crossover(
    other: CPPNNode,
    _fitness: number,
    _otherFitness: number,
    rng: RNG
  ): CPPNNode {
    if (this.type !== other.type || this.id !== other.id) {
      throw new Error('Mismatch in crossover')
    }
    const newBias = (this.bias + other.bias) / 2.0
    const newActivation = rng.genBool() ? this.activation : other.activation

    return this.createNode(
      {
        type: this.type,
        id: this.id,
        bias: newBias,
        activation: newActivation,
      },
      this.config,
      this.state
    )
  }

  override distance(other: CPPNNode): number {
    let distance = super.distance(other)
    distance += 0.5 * Number(this.activation !== other.activation)
    return distance
  }

  /**
   * @returns {NodeData<CPPNNodeFactoryOptions, null, null>} node data
   */
  override toJSON(): NodeData<CPPNNodeFactoryOptions, null, null> {
    return {
      config: null,
      state: null,
      factoryOptions: this.toFactoryOptions(),
    }
  }

  /**
   * @returns {CPPNNodeFactoryOptions} node factory options
   */
  override toFactoryOptions(): CPPNNodeFactoryOptions {
    return {
      type: this.type,
      id: this.id,
      bias: this.bias,
      activation: this.activation,
    }
  }
}
