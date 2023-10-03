import { NodeType } from './NodeType.js'

export const nodeTypeToNumber = (type: NodeType): number => {
  switch (type) {
    case NodeType.Input:
      return 0
    case NodeType.Hidden:
      return 1
    case NodeType.Output:
      return 2
  }
}

export const nodeNumberToType = (number: number): NodeType => {
  switch (number) {
    case 0:
      return NodeType.Input
    case 1:
      return NodeType.Hidden
    case 2:
      return NodeType.Output
    default:
      throw new Error(`Unknown node number: ${number}`)
  }
}
