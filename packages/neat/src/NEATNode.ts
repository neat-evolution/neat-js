import { Node, type NodeType } from '@neat-js/core'

import { createNode } from './createNode.js'

export class NEATNode extends Node<null, null, NEATNode> {
  constructor(type: NodeType, id: number) {
    super(type, id, null, null, createNode)
  }
}
