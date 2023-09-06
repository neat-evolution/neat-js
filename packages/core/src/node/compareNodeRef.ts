import { NodeType, type NodeRef } from './NodeData.js'

// FIXME: this isn't used anywhere
export const compareNodeRef = (a: NodeRef, b: NodeRef): number => {
  if (a.type === b.type) {
    switch (a.type) {
      case NodeType.Input:
        return a.id - b.id
      case NodeType.Hidden:
        return a.id - b.id
      case NodeType.Output:
        return a.id - b.id
    }
  } else {
    const order = [NodeType.Input, NodeType.Hidden, NodeType.Output]
    return order.indexOf(a.type) - order.indexOf(b.type)
  }
}
