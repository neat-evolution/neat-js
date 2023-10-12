import { NodeType, Activation, CoreNode, type NodeData } from '@neat-js/core'
import { threadRNG } from '@neat-js/utils'

import type { CPPNNodeFactoryOptions } from './CPPNNodeFactoryOptions.js'
import type { CPPNNodeOptions } from './CPPNNodeOptions.js'
import { createNode } from './createNode.js'

export class CPPNNode extends CoreNode<
  CPPNNodeFactoryOptions,
  null,
  null,
  null,
  CPPNNode
> {
  public activation: Activation
  public bias: number

  public nodeOptions: CPPNNodeOptions

  constructor(
    factoryOptions: CPPNNodeFactoryOptions,
    nodeOptions: CPPNNodeOptions
  ) {
    super(factoryOptions, null, null, createNode)
    this.nodeOptions = nodeOptions
    this.bias = factoryOptions.bias ?? 0
    this.activation = factoryOptions.activation ?? this.determineActivation()
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
    distance += 0.5 * Math.tanh(Math.abs(this.bias - other.bias))
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
