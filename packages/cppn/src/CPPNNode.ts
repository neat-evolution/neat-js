import {
  Activation,
  CoreNode,
  type NodeData,
  NodeType,
} from '@neat-evolution/core'
import { threadRNG } from '@neat-evolution/utils'

import type { CPPNContext } from './CPPNContext.js'
import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'
import type { CPPNNodeOptions } from './CPPNNodeOptions.js'
import { createNode } from './createNode.js'

export class CPPNNode extends CoreNode<CPPNContext> {
  public activation: Activation

  public nodeOptions: CPPNNodeOptions

  constructor(
    factoryOptions: CPPNNodeFactoryOptions,
    nodeOptions: CPPNNodeOptions
  ) {
    super(factoryOptions, null, null, createNode)
    this.nodeOptions = nodeOptions
    this.activation = factoryOptions.activation ?? this.determineActivation()
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
      node.activation = (
        node as unknown as { determineActivation: () => Activation }
      ).determineActivation()
    }
    return node
  }

  private determineActivation(): Activation {
    const rng = threadRNG()

    switch (this.type) {
      case NodeType.Input:
        return Activation.None
      case NodeType.Hidden: {
        return this.nodeOptions.hiddenActivations[
          rng.genRange(0, this.nodeOptions.hiddenActivations.length)
        ] as Activation
      }
      case NodeType.Output: {
        return this.nodeOptions.outputActivations[
          rng.genRange(0, this.nodeOptions.outputActivations.length)
        ] as Activation
      }
      default:
        throw new Error('Invalid NodeRef type')
    }
  }

  override crossover(
    other: CPPNNode,
    _fitness: number,
    _otherFitness: number
  ): CPPNNode {
    if (this.type !== other.type || this.id !== other.id) {
      throw new Error('Mismatch in crossover')
    }
    const newBias = (this.bias + other.bias) / 2.0
    const newActivation = threadRNG().genBool()
      ? this.activation
      : other.activation

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
